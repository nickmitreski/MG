// Industry-specific deduction fields
const industryDeductions = {
    construction: {
        title: "Construction Specific",
        fields: [
            { id: "toolStorage", label: "Tool Storage", placeholder: "Tool storage costs" },
            { id: "siteAllowance", label: "Site Allowance", placeholder: "Site allowance received" },
            { id: "safetyEquipment", label: "Safety Equipment", placeholder: "PPE and safety gear" }
        ]
    },
    healthcare: {
        title: "Healthcare Specific",
        fields: [
            { id: "medicalEquipment", label: "Medical Equipment", placeholder: "Medical equipment costs" },
            { id: "registration", label: "Professional Registration", placeholder: "Registration fees" },
            { id: "insurance", label: "Professional Indemnity", placeholder: "Insurance costs" }
        ]
    },
    education: {
        title: "Education Specific",
        fields: [
            { id: "teachingResources", label: "Teaching Resources", placeholder: "Teaching materials" },
            { id: "excursions", label: "Excursion Expenses", placeholder: "Work-related excursion costs" },
            { id: "reference", label: "Reference Materials", placeholder: "Books and resources" }
        ]
    },
    // Add more industries as needed
};

function updateDeductionFields() {
    const occupation = document.getElementById('occupationField').value;
    const employmentType = document.getElementById('employmentType').value;
    const industrySection = document.getElementById('industryDeductions');
    
    // Clear existing fields
    industrySection.innerHTML = '';
    
    // Add industry-specific fields if available
    if (industryDeductions[occupation]) {
        const deductions = industryDeductions[occupation];
        let html = `<h5 class="margin-20px-bottom">${deductions.title}</h5>`;
        
        deductions.fields.forEach(field => {
            html += `
                <div class="form-group">
                    <label>${field.label}</label>
                    <input type="number" id="${field.id}" class="form-control industry-deduction" 
                           placeholder="${field.placeholder}">
                </div>
            `;
        });
        
        industrySection.innerHTML = html;
    }

    // Show/hide relevant sections based on employment type
    const contractorFields = document.querySelectorAll('.contractor-only');
    contractorFields.forEach(field => {
        field.style.display = employmentType === 'contractor' ? 'block' : 'none';
    });
}

function calculateTax() {
    // Get basic input values
    const income = parseFloat(document.getElementById('annualIncome').value) || 0;
    const isResident = document.getElementById('residencyStatus').value === 'resident';
    const hasHELP = document.getElementById('hasHELP')?.checked || false;
    
    // Calculate deductions
    let totalDeductions = calculateTotalDeductions();
    
    // Calculate taxable income
    const taxableIncome = Math.max(0, income - totalDeductions);
    
    // Calculate tax components
    const baseTax = calculateBaseTax(taxableIncome, isResident);
    const medicareLevy = calculateMedicareLevy(taxableIncome, isResident);
    const lowIncomeOffset = calculateLowIncomeOffset(taxableIncome);
    const helpRepayment = hasHELP ? calculateHELPRepayment(taxableIncome) : 0;
    
    // Calculate final tax
    const totalTax = baseTax + medicareLevy - lowIncomeOffset + helpRepayment;
    const takeHomePay = income - totalTax;
    
    // Update results
    updateResults({
        grossIncome: income,
        totalDeductions: totalDeductions,
        taxableIncome: taxableIncome,
        baseTax: baseTax,
        medicareLevy: medicareLevy,
        lowIncomeOffset: lowIncomeOffset,
        helpRepayment: helpRepayment,
        totalTax: totalTax,
        takeHomePay: takeHomePay,
        takeHomePayMonthly: takeHomePay / 12,
        effectiveTaxRate: (totalTax / income * 100).toFixed(2) + '%'
    });
}

function calculateTotalDeductions() {
    let total = 0;
    
    // Common deductions
    const commonDeductionIds = [
        'vehicleExpenses', 'toolsEquipment', 'clothing', 'selfEducation',
        'incomeProtection', 'professionalFees', 'donations', 'taxAgentFees',
        'propertyExpenses', 'investmentInterest', 'managementFees'
    ];
    
    commonDeductionIds.forEach(id => {
        const value = parseFloat(document.getElementById(id)?.value) || 0;
        total += value;
    });
    
    // Home office calculations
    const homeOfficeMethod = document.getElementById('homeOfficeMethod').value;
    const hours = parseFloat(document.getElementById('homeOfficeHours').value) || 0;
    
    switch(homeOfficeMethod) {
        case 'shortcut':
            total += hours * 0.80;
            break;
        case 'fixed':
            total += hours * 0.52;
            break;
        case 'actual':
            // Add actual expense calculations
            break;
    }
    
    // Vehicle expenses
    const vehicleMethod = document.getElementById('vehicleMethod').value;
    if (vehicleMethod === 'cents') {
        const km = Math.min(parseFloat(document.getElementById('vehicleKm').value) || 0, 5000);
        total += km * 0.725;
    }
    
    // Industry-specific deductions
    document.querySelectorAll('.industry-deduction').forEach(input => {
        total += parseFloat(input.value) || 0;
    });
    
    return total;
}

function calculateBaseTax(taxableIncome, isResident) {
    let tax = 0;
    
    if (isResident) {
        // 2024-25 resident tax rates
        if (taxableIncome <= 18200) {
            tax = 0;
        } else if (taxableIncome <= 45000) {
            tax = (taxableIncome - 18200) * 0.16;
        } else if (taxableIncome <= 135000) {
            tax = 4288 + (taxableIncome - 45000) * 0.30;
        } else if (taxableIncome <= 190000) {
            tax = 31288 + (taxableIncome - 135000) * 0.37;
        } else {
            tax = 51538 + (taxableIncome - 190000) * 0.45;
        }
    } else {
        // 2024-25 Non-resident tax rates
        if (taxableIncome <= 135000) {
            tax = taxableIncome * 0.30;
        } else if (taxableIncome <= 190000) {
            tax = 40500 + (taxableIncome - 135000) * 0.37;
        } else {
            tax = 60850 + (taxableIncome - 190000) * 0.45;
        }
    }
    
    return tax;
}

function calculateMedicareLevy(taxableIncome, isResident) {
    if (!isResident) return 0;
    
    // Standard Medicare levy rate
    const levyRate = 0.02;
    
    // Medicare levy reduction/exemption thresholds (2023-24, update when 2024-25 is available)
    const singleLowerThreshold = 24276;
    const singleUpperThreshold = 30345;
    
    // Full exemption for low income
    if (taxableIncome <= singleLowerThreshold) {
        return 0;
    }
    
    // Reduced levy for income between thresholds
    if (taxableIncome <= singleUpperThreshold) {
        // Calculate reduced levy using formula: 
        // Levy = (taxable income - lower threshold) × 10% × levy rate
        return (taxableIncome - singleLowerThreshold) * 0.10 * levyRate;
    }
    
    // Standard 2% Medicare levy
    return taxableIncome * levyRate;
}

function calculateLowIncomeOffset(taxableIncome) {
    // Low Income Tax Offset (LITO) for 2024-25
    let offset = 0;
    
    if (taxableIncome <= 37500) {
        offset = 700;
    } else if (taxableIncome <= 45000) {
        offset = 700 - ((taxableIncome - 37500) * 0.05);
    } else if (taxableIncome <= 66667) {
        offset = 325 - ((taxableIncome - 45000) * 0.015);
    }
    
    return offset;
}

function calculateHELPRepayment(taxableIncome) {
    // HELP/HECS debt repayment thresholds for 2023-24 (update when 2024-25 is available)
    if (taxableIncome < 51550) {
        return 0;
    } else if (taxableIncome < 59518) {
        return taxableIncome * 0.01;
    } else if (taxableIncome < 67087) {
        return taxableIncome * 0.02;
    } else if (taxableIncome < 70889) {
        return taxableIncome * 0.025;
    } else if (taxableIncome < 74990) {
        return taxableIncome * 0.03;
    } else if (taxableIncome < 79391) {
        return taxableIncome * 0.035;
    } else if (taxableIncome < 83955) {
        return taxableIncome * 0.04;
    } else if (taxableIncome < 88763) {
        return taxableIncome * 0.045;
    } else if (taxableIncome < 93843) {
        return taxableIncome * 0.05;
    } else if (taxableIncome < 99214) {
        return taxableIncome * 0.055;
    } else if (taxableIncome < 104906) {
        return taxableIncome * 0.06;
    } else if (taxableIncome < 110951) {
        return taxableIncome * 0.065;
    } else if (taxableIncome < 117377) {
        return taxableIncome * 0.07;
    } else if (taxableIncome < 124222) {
        return taxableIncome * 0.075;
    } else if (taxableIncome < 131543) {
        return taxableIncome * 0.08;
    } else if (taxableIncome < 139381) {
        return taxableIncome * 0.085;
    } else if (taxableIncome < 147788) {
        return taxableIncome * 0.09;
    } else if (taxableIncome < 156806) {
        return taxableIncome * 0.095;
    } else {
        return taxableIncome * 0.10;
    }
}

function updateResults(results) {
    Object.keys(results).forEach(key => {
        const element = document.getElementById(key);
        if (element) {
            if (key === 'effectiveTaxRate') {
                element.textContent = results[key];
            } else {
                element.textContent = formatCurrency(results[key]);
            }
        }
    });
}

function formatCurrency(amount) {
    return '$' + amount.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Initialize the form when the page loads
document.addEventListener('DOMContentLoaded', function() {
    updateDeductionFields();
    
    // Add event listener to the calculate button
    document.querySelector('.calculator-btn').addEventListener('click', function(e) {
        e.preventDefault();
        calculateTax();
    });
    
    // Add event listeners for real-time calculations
    document.getElementById('annualIncome').addEventListener('input', debounce(calculateTax, 500));
    
    // Setup display toggle for vehicle expense input method
    document.getElementById('vehicleMethod').addEventListener('change', function() {
        const kmInput = document.getElementById('vehicleKm');
        const expensesInput = document.getElementById('vehicleExpenses');
        
        if (this.value === 'cents') {
            kmInput.classList.remove('hidden');
            expensesInput.classList.add('hidden');
        } else {
            kmInput.classList.add('hidden');
            expensesInput.classList.remove('hidden');
        }
    });
    
    // Setup display toggle for home office expense input method
    document.getElementById('homeOfficeMethod').addEventListener('change', function() {
        const hoursInput = document.getElementById('homeOfficeHours');
        const actualExpenses = document.getElementById('actualHomeExpenses');
        
        if (this.value === 'actual') {
            actualExpenses.classList.remove('hidden');
        } else {
            actualExpenses.classList.add('hidden');
        }
    });
});

// Debounce function to limit how often a function is called
function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            func.apply(context, args);
        }, wait);
    };
}

// Tax Calculator for 2024-2025 Financial Year
document.addEventListener('DOMContentLoaded', function() {
    // Get references to form elements
    const annualIncomeInput = document.getElementById('annualIncome');
    const taxWithheldInput = document.getElementById('taxWithheld');
    const superContributionsInput = document.getElementById('superContributions');
    const fringeBenefitsInput = document.getElementById('fringeBenefits');
    const otherIncomeInput = document.getElementById('otherIncome');
    const totalDeductionsInput = document.getElementById('totalDeductions');
    const helpBalanceInput = document.getElementById('helpBalance');
    const calculateButton = document.querySelector('.calculator-btn');
    
    // Get references to result elements
    const grossIncomeResult = document.getElementById('grossIncome');
    const deductionsAmountResult = document.getElementById('deductionsAmount');
    const taxableIncomeResult = document.getElementById('taxableIncome');
    const totalTaxLiabilityResult = document.getElementById('totalTaxLiability');
    const taxWithheldAmountResult = document.getElementById('taxWithheldAmount');
    const taxRefundResult = document.getElementById('taxRefund');
    
    // Tax rates for 2024-2025 (Stage 3 tax cuts)
    const taxRates = [
        { threshold: 0, rate: 0 },
        { threshold: 18200, rate: 0.19 },
        { threshold: 45000, rate: 0.30 },
        { threshold: 135000, rate: 0.37 },
        { threshold: 190000, rate: 0.45 }
    ];
    
    // Medicare levy rate
    const medicareLevy = 0.02;
    
    // Low Income Tax Offset (LITO) parameters
    const litoMax = 700;
    const litoPhaseOutRate1 = 0.05;
    const litoPhaseOutThreshold1 = 37500;
    const litoPhaseOutRate2 = 0.015;
    const litoPhaseOutThreshold2 = 45000;
    
    // HELP/HECS repayment rates
    const helpRepaymentRates = [
        { threshold: 0, rate: 0 },
        { threshold: 51550, rate: 0.01 },
        { threshold: 57154, rate: 0.02 },
        { threshold: 62738, rate: 0.025 },
        { threshold: 66502, rate: 0.03 },
        { threshold: 70717, rate: 0.035 },
        { threshold: 75956, rate: 0.04 },
        { threshold: 81808, rate: 0.045 },
        { threshold: 86768, rate: 0.05 },
        { threshold: 91647, rate: 0.055 },
        { threshold: 96709, rate: 0.06 },
        { threshold: 102013, rate: 0.065 },
        { threshold: 107762, rate: 0.07 },
        { threshold: 113720, rate: 0.075 },
        { threshold: 120193, rate: 0.08 },
        { threshold: 126968, rate: 0.085 },
        { threshold: 134096, rate: 0.09 },
        { threshold: 141533, rate: 0.095 },
        { threshold: 149420, rate: 0.10 }
    ];
    
    // Calculate tax function
    function calculateTax(taxableIncome) {
        let tax = 0;
        
        for (let i = taxRates.length - 1; i >= 0; i--) {
            if (taxableIncome > taxRates[i].threshold) {
                tax += (taxableIncome - taxRates[i].threshold) * taxRates[i].rate;
                taxableIncome = taxRates[i].threshold;
            }
        }
        
        return tax;
    }
    
    // Calculate LITO
    function calculateLITO(taxableIncome) {
        if (taxableIncome <= litoPhaseOutThreshold1) {
            return litoMax;
        } else if (taxableIncome <= litoPhaseOutThreshold2) {
            return litoMax - litoPhaseOutRate1 * (taxableIncome - litoPhaseOutThreshold1);
        } else {
            const baseReduction = litoMax - litoPhaseOutRate1 * (litoPhaseOutThreshold2 - litoPhaseOutThreshold1);
            const additionalReduction = litoPhaseOutRate2 * (taxableIncome - litoPhaseOutThreshold2);
            const totalReduction = baseReduction - additionalReduction;
            return Math.max(0, totalReduction);
        }
    }
    
    // Calculate HELP/HECS repayment
    function calculateHelpRepayment(taxableIncome, helpBalance) {
        if (!helpBalance || helpBalance <= 0) {
            return 0;
        }
        
        let rate = 0;
        for (let i = helpRepaymentRates.length - 1; i >= 0; i--) {
            if (taxableIncome > helpRepaymentRates[i].threshold) {
                rate = helpRepaymentRates[i].rate;
                break;
            }
        }
        
        return taxableIncome * rate;
    }
    
    // Calculate tax refund
    function calculateRefund() {
        // Get values from inputs
        const annualIncome = parseFloat(annualIncomeInput.value) || 0;
        const taxWithheld = parseFloat(taxWithheldInput.value) || 0;
        const superContributions = parseFloat(superContributionsInput?.value) || 0;
        const fringeBenefits = parseFloat(fringeBenefitsInput?.value) || 0;
        const otherIncome = parseFloat(otherIncomeInput?.value) || 0;
        const totalDeductions = parseFloat(totalDeductionsInput?.value) || 0;
        const helpBalance = parseFloat(helpBalanceInput?.value) || 0;
        
        // Calculate gross income
        const grossIncome = annualIncome + otherIncome;
        
        // Calculate taxable income
        const taxableIncome = Math.max(0, grossIncome - totalDeductions);
        
        // Calculate base tax
        const baseTax = calculateTax(taxableIncome);
        
        // Calculate Medicare levy
        const medicare = Math.round(taxableIncome * medicareLevy);
        
        // Calculate LITO
        const lito = calculateLITO(taxableIncome);
        
        // Calculate total tax liability
        const totalTaxLiability = Math.max(0, baseTax + medicare - lito);
        
        // Calculate tax refund/debt
        const taxRefund = taxWithheld - totalTaxLiability;
        
        // Calculate HELP/HECS repayment
        const helpRepayment = calculateHelpRepayment(taxableIncome, helpBalance);
        
        // Update results
        grossIncomeResult.textContent = formatCurrency(grossIncome);
        deductionsAmountResult.textContent = formatCurrency(totalDeductions);
        taxableIncomeResult.textContent = formatCurrency(taxableIncome);
        totalTaxLiabilityResult.textContent = formatCurrency(totalTaxLiability);
        taxWithheldAmountResult.textContent = formatCurrency(taxWithheld);
        
        // Highlight refund or debt with color
        if (taxRefund >= 0) {
            taxRefundResult.textContent = formatCurrency(taxRefund);
            taxRefundResult.style.color = '#28a745'; // Green for refund
        } else {
            taxRefundResult.textContent = formatCurrency(taxRefund);
            taxRefundResult.style.color = '#dc3545'; // Red for debt
        }
    }
    
    // Add event listener to calculate button
    if (calculateButton) {
        calculateButton.addEventListener('click', function(e) {
            e.preventDefault();
            calculateRefund();
        });
    }
    
    // Initialize with zeros
    calculateRefund();
    
    // Ensure the advanced options dropdown works
    const advancedOptionsToggle = document.querySelector('.panel-heading');
    const advancedOptionsPanel = document.getElementById('advancedOptions');
    const advancedOptionsIcon = advancedOptionsToggle ? advancedOptionsToggle.querySelector('i') : null;
    
    if (advancedOptionsPanel && advancedOptionsIcon) {
        // Setup event listeners once
        $(advancedOptionsPanel).on('shown.bs.collapse', function() {
            advancedOptionsIcon.classList.remove('fa-chevron-down');
            advancedOptionsIcon.classList.add('fa-chevron-up');
        });
        
        $(advancedOptionsPanel).on('hidden.bs.collapse', function() {
            advancedOptionsIcon.classList.remove('fa-chevron-up');
            advancedOptionsIcon.classList.add('fa-chevron-down');
        });
    }
}); 