/**
 * Employee field validation rules
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NAME_RE = /^[A-Za-z\s.'-]+$/;
const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;

const isEmpty = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

const isDate = (v) => !isNaN(Date.parse(v));
const isPastDate = (v) => isDate(v) && new Date(v) < new Date();
const isNotFutureDate = (v) => isDate(v) && new Date(v) <= new Date();

/**
 * Field definitions.
 * required: only enforced in create mode (update may omit fields).
 * validate: returns an error message string, or null/undefined if valid.
 */
const FIELDS = {
  first_name: {
    required: true,
    label: 'First name',
    validate: (v) => {
      if (!NAME_RE.test(v)) return 'First name must contain only letters, spaces, dots, hyphens or apostrophes';
      if (v.length > 50) return 'First name must be 50 characters or less';
      return null;
    }
  },
  last_name: {
    required: true,
    label: 'Last name',
    validate: (v) => {
      if (!NAME_RE.test(v)) return 'Last name must contain only letters, spaces, dots, hyphens or apostrophes';
      if (v.length > 50) return 'Last name must be 50 characters or less';
      return null;
    }
  },
  email: {
    required: true,
    label: 'Email',
    validate: (v) => {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Email must be a valid address (e.g. name@domain.com)';
      if (v.length > 100) return 'Email must be 100 characters or less';
      return null;
    }
  },
  phone: {
    required: true,
    label: 'Phone number',
    validate: (v) => {
      const digits = v.replace(/\D/g, '');
      if (digits.length !== 10) return 'Phone number must be exactly 10 digits';
      if (!/^[0-9+\s-]+$/.test(v)) return 'Phone number contains invalid characters';
      return null;
    }
  },
  gender: {
    required: false,
    label: 'Gender',
    validate: (v) => (['Male', 'Female', 'Other'].includes(v) ? null : 'Gender must be Male, Female or Other')
  },
  date_of_birth: {
    required: false,
    label: 'Date of birth',
    validate: (v) => {
      if (!isPastDate(v)) return 'Date of birth must be a valid date in the past';
      const age = Math.floor((Date.now() - new Date(v)) / (365.25 * 24 * 3600 * 1000));
      if (age > 100) return 'Date of birth indicates an invalid age';
      return null;
    }
  },
  address: {
    required: false,
    label: 'Address',
    validate: (v) => (v.length > 255 ? 'Address must be 255 characters or less' : null)
  },
  city: {
    required: false,
    label: 'City',
    validate: (v) => (v.length > 100 ? 'City must be 100 characters or less' : null)
  },
  state: {
    required: false,
    label: 'State',
    validate: (v) => (v.length > 100 ? 'State must be 100 characters or less' : null)
  },
  postal_code: {
    required: false,
    label: 'Postal code',
    validate: (v) => (/^\d{6}$/.test(v) ? null : 'Postal code must be a 6-digit PIN code')
  },
  country: {
    required: false,
    label: 'Country',
    validate: (v) => (v.length > 100 ? 'Country must be 100 characters or less' : null)
  },
  emergency_contact_name: {
    required: false,
    label: 'Emergency contact name',
    validate: (v) => (v.length > 100 ? 'Emergency contact name must be 100 characters or less' : null)
  },
  emergency_contact_phone: {
    required: false,
    label: 'Emergency contact phone',
    validate: (v) => {
      const digits = v.replace(/\D/g, '');
      if (digits.length !== 10) return 'Emergency contact phone must be exactly 10 digits';
      return null;
    }
  },
  emergency_contact_relation: {
    required: false,
    label: 'Emergency contact relation',
    validate: (v) => (v.length > 50 ? 'Emergency contact relation must be 50 characters or less' : null)
  },
  department_id: {
    required: false,
    label: 'Department',
    validate: (v) => (UUID_RE.test(v) ? null : 'Department ID must be a valid ID')
  },
  designation_id: {
    required: false,
    label: 'Designation',
    validate: (v) => (UUID_RE.test(v) ? null : 'Designation ID must be a valid ID')
  },
  reporting_manager_id: {
    required: false,
    label: 'Reporting manager',
    validate: (v) => (UUID_RE.test(v) ? null : 'Reporting manager ID must be a valid ID')
  },
  joining_date: {
    required: false,
    label: 'Joining date',
    validate: (v) => (isNotFutureDate(v) ? null : 'Joining date must be a valid date and cannot be in the future')
  },
  employment_type: {
    required: false,
    label: 'Employment type',
    validate: (v) => (
      ['Full-Time', 'Part-Time', 'Contract', 'Intern', 'Temporary'].includes(v)
        ? null : 'Employment type must be Full-Time, Part-Time, Contract, Intern or Temporary'
    )
  },
  work_location: {
    required: false,
    label: 'Work location',
    validate: (v) => (v.length > 100 ? 'Work location must be 100 characters or less' : null)
  },
  bank_account_name: {
    required: false,
    label: 'Bank account name',
    validate: (v) => (v.length > 100 ? 'Bank account name must be 100 characters or less' : null)
  },
  bank_account_number: {
    required: false,
    label: 'Bank account number',
    validate: (v) => (/^\d{9,18}$/.test(v) ? null : 'Bank account number must be 9-18 digits')
  },
  bank_name: {
    required: false,
    label: 'Bank name',
    validate: (v) => (v.length > 100 ? 'Bank name must be 100 characters or less' : null)
  },
  bank_ifsc: {
    required: false,
    label: 'Bank IFSC',
    validate: (v) => (IFSC_RE.test(v) ? null : 'Bank IFSC must be in valid format (e.g. SBIN0001234)')
  },
  bank_branch: {
    required: false,
    label: 'Bank branch',
    validate: (v) => (v.length > 100 ? 'Bank branch must be 100 characters or less' : null)
  },
  pan_number: {
    required: false,
    label: 'PAN number',
    validate: (v) => (PAN_RE.test(v.toUpperCase()) ? null : 'PAN number must be in valid format (e.g. ABCDE1234F)')
  },
  aadhar_number: {
    required: false,
    label: 'Aadhar number',
    validate: (v) => (/^\d{12}$/.test(v) ? null : 'Aadhar number must be exactly 12 digits')
  },
  uan_number: {
    required: false,
    label: 'UAN number',
    validate: (v) => (/^\d{12}$/.test(v) ? null : 'UAN number must be exactly 12 digits')
  },
  pf_number: {
    required: false,
    label: 'PF number',
    validate: (v) => (v.length > 50 ? 'PF number must be 50 characters or less' : null)
  }
};

/**
 * Validate employee data.
 * mode: 'create' enforces required fields; 'update' validates only provided fields.
 * Returns an array of error messages (empty when valid).
 */
const validateEmployee = (data, mode = 'create') => {
  const errors = [];

  for (const [field, def] of Object.entries(FIELDS)) {
    const value = data[field];

    if (isEmpty(value)) {
      if (mode === 'create' && def.required) {
        errors.push(`${def.label} is required`);
      }
      continue;
    }

    const err = def.validate(String(value).trim());
    if (err) errors.push(err);
  }

  return errors;
};

module.exports = { validateEmployee, FIELDS };
