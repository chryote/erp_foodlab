<?php

use App\Models\Company;
use App\Support\ActiveCompany;

if (! function_exists('active_company')) {
    /**
     * Retrieve the currently active Company selected in the secondary tab header.
     */
    function active_company(): ?Company
    {
        return ActiveCompany::get();
    }
}

if (! function_exists('active_company_id')) {
    /**
     * Retrieve the ID of the currently active Company selected in the secondary tab header.
     */
    function active_company_id(): ?int
    {
        return ActiveCompany::id();
    }
}
