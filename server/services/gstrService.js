const { supabase } = require('../db_supabase');

/**
 * GSTR Service for handling GSTR-1 and GSTR-3B generation and retrieval
 */
class GSTRService {
    /**
     * Generate GSTR-1 entries from invoices for a given period
     */
    static async generateGSTR1FromInvoices(tenantId, returnPeriod) {
        try {
            // Check if GSTR-1 already exists for this period
            const { data: existingReturn } = await supabase
                .from('gstr1_returns')
                .select('id')
                .eq('tenant_id', tenantId)
                .eq('return_period', returnPeriod)
                .single();

            if (existingReturn) {
                throw new Error(`GSTR-1 already exists for period ${returnPeriod}`);
            }

            // Get all invoices for the period
            const startDate = new Date(`${returnPeriod.substring(0, 4)}-${returnPeriod.substring(4, 6)}-01`);
            const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);

            const { data: invoices, error } = await supabase
                .from('invoices')
                .select(`
                    *,
                    customers (name, gstin, state_code),
                    invoice_items (*)
                `)
                .eq('tenant_id', tenantId)
                .gte('date', startDate.toISOString().split('T')[0])
                .lte('date', endDate.toISOString().split('T')[0]);

            if (error) throw error;

            // Create GSTR-1 return
            const { data: gstr1Return, error: insertError } = await supabase
                .from('gstr1_returns')
                .insert({
                    tenant_id: tenantId,
                    return_period: returnPeriod,
                    total_invoice_count: invoices?.length || 0
                })
                .select()
                .single();

            if (insertError) throw insertError;

            if (!invoices || invoices.length === 0) {
                return; // No invoices to process
            }

            // Process each invoice
            for (const invoice of invoices) {
                await this.processInvoiceForGSTR1(gstr1Return.id, invoice);
            }

            // Update totals
            await this.updateGSTR1Totals(gstr1Return.id);

        } catch (error) {
            console.error('Error generating GSTR-1:', error);
            throw error;
        }
    }

    /**
     * Process a single invoice for GSTR-1
     */
    static async processInvoiceForGSTR1(gstr1ReturnId, invoice) {
        const customer = invoice.customers;
        const isIntraState = customer.state_code === '24'; // Assuming Gujarat as base state, adjust as needed
        const isRegistered = customer.gstin && customer.gstin.length > 0;

        // Calculate taxes
        const igst = invoice.igst || 0;
        const cgst = invoice.cgst || 0;
        const sgst = invoice.sgst || 0;
        const taxableValue = invoice.total_taxable;

        if (isRegistered && taxableValue > 0) {
            // B2B Invoice (Section 4A/4B/4C)
            await supabase
                .from('gstr1_b2b')
                .insert({
                    gstr1_return_id: gstr1ReturnId,
                    invoice_id: invoice.id,
                    invoice_number: invoice.invoice_no,
                    invoice_date: invoice.date,
                    customer_gstin: customer.gstin,
                    customer_name: customer.name,
                    place_of_supply: customer.state_code,
                    reverse_charge: invoice.is_reverse_charge || false,
                    taxable_value: taxableValue,
                    igst_amount: igst,
                    cgst_amount: cgst,
                    sgst_amount: sgst
                });
        } else if (!isRegistered && taxableValue > 250000 && !isIntraState) {
            // B2C Large Inter-state (Section 5A/5B)
            await supabase
                .from('gstr1_b2cl')
                .insert({
                    gstr1_return_id: gstr1ReturnId,
                    invoice_id: invoice.id,
                    invoice_number: invoice.invoice_no,
                    invoice_date: invoice.date,
                    place_of_supply: customer.state_code,
                    taxable_value: taxableValue,
                    igst_rate: igst > 0 ? (igst / taxableValue) * 100 : 0,
                    igst_amount: igst
                });
        } else if (!isRegistered && taxableValue <= 250000) {
            // B2C Small (Section 7) - Aggregate by state and rate
            await this.addToB2CS(gstr1ReturnId, customer.state_code, taxableValue, igst, cgst, sgst);
        }

        // Handle exports (Section 6B)
        if (invoice.type === 'EXPORT') {
            await supabase
                .from('gstr1_exp')
                .insert({
                    gstr1_return_id: gstr1ReturnId,
                    invoice_id: invoice.id,
                    invoice_number: invoice.invoice_no,
                    invoice_date: invoice.date,
                    export_type: invoice.export_type === 'WITHOUT_PAYMENT' ? 'WOPAY' : 'WPAY',
                    shipping_bill_no: invoice.shipping_bill_no,
                    shipping_bill_date: invoice.shipping_bill_date,
                    taxable_value: taxableValue,
                    igst_amount: igst
                });
        }

        // Handle nil/exempt/non-GST supplies (Section 8)
        if (taxableValue === 0 || (igst === 0 && cgst === 0 && sgst === 0)) {
            await this.addToNilSupplies(gstr1ReturnId, taxableValue, 'Exempt supplies');
        }
    }

    /**
     * Add to B2C Small supplies (aggregate)
     */
    static async addToB2CS(
        gstr1ReturnId,
        placeOfSupply,
        taxableValue,
        igst,
        cgst,
        sgst
    ) {
        const applicableRate = igst > 0 ? (igst / taxableValue) * 100 : cgst > 0 ? (cgst / taxableValue) * 200 : 0;

        // Check if entry already exists for this state and rate
        const { data: existing } = await supabase
            .from('gstr1_b2cs')
            .select('id, taxable_value, igst_amount, cgst_amount, sgst_amount')
            .eq('gstr1_return_id', gstr1ReturnId)
            .eq('place_of_supply', placeOfSupply)
            .eq('applicable_tax_rate', applicableRate)
            .maybeSingle();

        if (existing) {
            // Update existing
            await supabase
                .from('gstr1_b2cs')
                .update({
                    taxable_value: existing.taxable_value + taxableValue,
                    igst_amount: existing.igst_amount + igst,
                    cgst_amount: existing.cgst_amount + cgst,
                    sgst_amount: existing.sgst_amount + sgst
                })
                .eq('id', existing.id);
        } else {
            // Create new
            await supabase
                .from('gstr1_b2cs')
                .insert({
                    gstr1_return_id: gstr1ReturnId,
                    place_of_supply: placeOfSupply,
                    applicable_tax_rate: applicableRate,
                    taxable_value: taxableValue,
                    igst_amount: igst,
                    cgst_amount: cgst,
                    sgst_amount: sgst
                });
        }
    }

    /**
     * Add to Nil/Exempt supplies
     */
    static async addToNilSupplies(
        gstr1ReturnId,
        amount,
        description
    ) {
        await supabase
            .from('gstr1_nil')
            .insert({
                gstr1_return_id: gstr1ReturnId,
                description: description,
                exempt_amount: amount
            });
    }

    /**
     * Update GSTR-1 totals
     */
    static async updateGSTR1Totals(gstr1ReturnId) {
        // Aggregate from all sections
        const { data: b2bTotals } = await supabase
            .from('gstr1_b2b')
            .select('taxable_value, igst_amount, cgst_amount, sgst_amount')
            .eq('gstr1_return_id', gstr1ReturnId);

        const { data: b2clTotals } = await supabase
            .from('gstr1_b2cl')
            .select('taxable_value, igst_amount')
            .eq('gstr1_return_id', gstr1ReturnId);

        const { data: b2csTotals } = await supabase
            .from('gstr1_b2cs')
            .select('taxable_value, igst_amount, cgst_amount, sgst_amount')
            .eq('gstr1_return_id', gstr1ReturnId);

        // Calculate totals
        const totalTaxable = [
            ...(b2bTotals || []).map(item => item.taxable_value),
            ...(b2clTotals || []).map(item => item.taxable_value),
            ...(b2csTotals || []).map(item => item.taxable_value)
        ].reduce((sum, val) => sum + val, 0);

        const totalIgst = [
            ...(b2bTotals || []).map(item => item.igst_amount),
            ...(b2clTotals || []).map(item => item.igst_amount),
            ...(b2csTotals || []).map(item => item.igst_amount)
        ].reduce((sum, val) => sum + val, 0);

        const totalCgst = [
            ...(b2bTotals || []).map(item => item.cgst_amount),
            ...(b2csTotals || []).map(item => item.cgst_amount)
        ].reduce((sum, val) => sum + val, 0);

        const totalSgst = [
            ...(b2bTotals || []).map(item => item.sgst_amount),
            ...(b2csTotals || []).map(item => item.sgst_amount)
        ].reduce((sum, val) => sum + val, 0);

        // Update the return
        await supabase
            .from('gstr1_returns')
            .update({
                total_taxable_value: totalTaxable,
                total_igst: totalIgst,
                total_cgst: totalCgst,
                total_sgst: totalSgst
            })
            .eq('id', gstr1ReturnId);
    }

    /**
     * Generate GSTR-3B from GSTR-1 data
     */
    static async generateGSTR3BFromGSTR1(tenantId, returnPeriod) {
        try {
            // Check if GSTR-3B already exists
            const { data: existingReturn } = await supabase
                .from('gstr3b_returns')
                .select('id')
                .eq('tenant_id', tenantId)
                .eq('return_period', returnPeriod)
                .maybeSingle();

            if (existingReturn) {
                throw new Error(`GSTR-3B already exists for period ${returnPeriod}`);
            }

            // Get GSTR-1 data for this period
            const { data: gstr1Return } = await supabase
                .from('gstr1_returns')
                .select('id')
                .eq('tenant_id', tenantId)
                .eq('return_period', returnPeriod)
                .maybeSingle();

            if (!gstr1Return) {
                throw new Error(`GSTR-1 not found for period ${returnPeriod}`);
            }

            // Create GSTR-3B return
            const financialYear = this.getFinancialYear(returnPeriod);
            const { data: gstr3bReturn, error: insertError } = await supabase
                .from('gstr3b_returns')
                .insert({
                    tenant_id: tenantId,
                    return_period: returnPeriod,
                    financial_year: financialYear
                })
                .select()
                .single();

            if (insertError) throw insertError;

            // Populate section 3.1(a) from GSTR-1 data
            await this.populateSection3_1_a(gstr3bReturn.id, gstr1Return.id);

            // Populate section 3.2 from B2C data
            await this.populateSection3_2(gstr3bReturn.id, gstr1Return.id);

            // Populate section 3.1(c) from nil supplies
            await this.populateSection3_1_c(gstr3bReturn.id, gstr1Return.id);

        } catch (error) {
            console.error('Error generating GSTR-3B:', error);
            throw error;
        }
    }

    /**
     * Populate GSTR-3B section 3.1(a) from GSTR-1 B2B, B2CL, EXP data
     */
    static async populateSection3_1_a(gstr3bReturnId, gstr1ReturnId) {
        // Get B2B totals by place of supply
        const { data: b2bData } = await supabase
            .from('gstr1_b2b')
            .select('place_of_supply, taxable_value, igst_amount, cgst_amount, sgst_amount')
            .eq('gstr1_return_id', gstr1ReturnId);

        // Get B2CL totals
        const { data: b2clData } = await supabase
            .from('gstr1_b2cl')
            .select('place_of_supply, taxable_value, igst_amount')
            .eq('gstr1_return_id', gstr1ReturnId);

        // Get EXP totals
        const { data: expData } = await supabase
            .from('gstr1_exp')
            .select('taxable_value, igst_amount')
            .eq('gstr1_return_id', gstr1ReturnId);

        // Aggregate by place of supply
        const aggregated = {};

        // Process B2B
        (b2bData || []).forEach(item => {
            const pos = item.place_of_supply;
            if (!aggregated[pos]) aggregated[pos] = { taxable: 0, igst: 0, cgst: 0, sgst: 0 };
            aggregated[pos].taxable += item.taxable_value;
            aggregated[pos].igst += item.igst_amount;
            aggregated[pos].cgst += item.cgst_amount;
            aggregated[pos].sgst += item.sgst_amount;
        });

        // Process B2CL
        (b2clData || []).forEach(item => {
            const pos = item.place_of_supply;
            if (!aggregated[pos]) aggregated[pos] = { taxable: 0, igst: 0, cgst: 0, sgst: 0 };
            aggregated[pos].taxable += item.taxable_value;
            aggregated[pos].igst += item.igst_amount;
        });

        // Process EXP (assume inter-state)
        const expTotal = (expData || []).reduce((sum, item) => ({
            taxable: sum.taxable + item.taxable_value,
            igst: sum.igst + item.igst_amount
        }), { taxable: 0, igst: 0 });

        if (expTotal.taxable > 0) {
            const expPos = 'EXPORT'; // Special POS for exports
            aggregated[expPos] = { taxable: expTotal.taxable, igst: expTotal.igst, cgst: 0, sgst: 0 };
        }

        // Insert into GSTR-3B section 3.1(a)
        for (const [pos, totals] of Object.entries(aggregated)) {
            await supabase
                .from('gstr3b_3_1_a')
                .insert({
                    gstr3b_return_id: gstr3bReturnId,
                    place_of_supply: pos === 'EXPORT' ? null : pos,
                    taxable_value: totals.taxable,
                    igst_amount: totals.igst,
                    cgst_amount: totals.cgst,
                    sgst_amount: totals.sgst
                });
        }
    }

    /**
     * Populate GSTR-3B section 3.2 from GSTR-1 B2CS data
     */
    static async populateSection3_2(gstr3bReturnId, gstr1ReturnId) {
        const { data: b2csData } = await supabase
            .from('gstr1_b2cs')
            .select('place_of_supply, taxable_value, igst_amount')
            .eq('gstr1_return_id', gstr1ReturnId);

        // Aggregate by place of supply
        const aggregated = {};

        (b2csData || []).forEach(item => {
            const pos = item.place_of_supply;
            if (!aggregated[pos]) aggregated[pos] = { taxable: 0, igst: 0 };
            aggregated[pos].taxable += item.taxable_value;
            aggregated[pos].igst += item.igst_amount;
        });

        // Insert into section 3.2
        for (const [pos, totals] of Object.entries(aggregated)) {
            await supabase
                .from('gstr3b_3_2')
                .insert({
                    gstr3b_return_id: gstr3bReturnId,
                    place_of_supply: pos,
                    taxable_value: totals.taxable,
                    igst_amount: totals.igst
                });
        }
    }

    /**
     * Populate GSTR-3B section 3.1(c) from GSTR-1 nil supplies
     */
    static async populateSection3_1_c(gstr3bReturnId, gstr1ReturnId) {
        const { data: nilData } = await supabase
            .from('gstr1_nil')
            .select('description, nil_amount, exempt_amount, non_gst_amount')
            .eq('gstr1_return_id', gstr1ReturnId);

        for (const item of (nilData || [])) {
            await supabase
                .from('gstr3b_3_1_c')
                .insert({
                    gstr3b_return_id: gstr3bReturnId,
                    description: item.description,
                    nil_amount: item.nil_amount || 0,
                    exempt_amount: item.exempt_amount || 0,
                    non_gst_amount: item.non_gst_amount || 0
                });
        }
    }

    /**
     * Get financial year from return period
     */
    static getFinancialYear(returnPeriod) {
        const year = parseInt(returnPeriod.substring(0, 4));
        const month = parseInt(returnPeriod.substring(4, 6));

        if (month >= 4) {
            return `${year}-${year + 1}`;
        } else {
            return `${year - 1}-${year}`;
        }
    }

    /**
     * Get GSTR returns for a tenant
     */
    static async getGSTRReturns(tenantId) {
        const { data: gstr1Returns } = await supabase
            .from('gstr1_returns')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('return_period', { ascending: false });

        const { data: gstr3bReturns } = await supabase
            .from('gstr3b_returns')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('return_period', { ascending: false });

        return {
            gstr1: gstr1Returns || [],
            gstr3b: gstr3bReturns || []
        };
    }
}

module.exports = { GSTRService };
