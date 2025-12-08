// Environment variable validation for Valyu OAuth and core services

interface EnvValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validatePaymentEnvironment(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = !isDevelopment;

  // Core Supabase requirements (always required)
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    errors.push('NEXT_PUBLIC_SUPABASE_URL is required');
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is required');
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    errors.push('SUPABASE_SERVICE_ROLE_KEY is required');
  }

  // Production-only requirements
  if (isProduction) {
    // Valyu OAuth requirements
    if (!process.env.NEXT_PUBLIC_VALYU_SUPABASE_URL) {
      warnings.push('NEXT_PUBLIC_VALYU_SUPABASE_URL missing - Valyu OAuth will fail');
    }
    if (!process.env.NEXT_PUBLIC_VALYU_CLIENT_ID) {
      warnings.push('NEXT_PUBLIC_VALYU_CLIENT_ID missing - Valyu OAuth will fail');
    }
    if (!process.env.VALYU_CLIENT_SECRET) {
      warnings.push('VALYU_CLIENT_SECRET missing - Valyu OAuth will fail');
    }

    // API keys for services
    if (!process.env.VALYU_API_KEY) {
      warnings.push('VALYU_API_KEY missing - biomedical/web search will fail for dev mode');
    }
    if (!process.env.DAYTONA_API_KEY) {
      warnings.push('DAYTONA_API_KEY missing - code execution will fail');
    }
    if (!process.env.OPENAI_API_KEY) {
      warnings.push('OPENAI_API_KEY missing - will use Vercel AI Gateway');
    }
  }

  // Validate URL formats
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('https://')) {
    errors.push('NEXT_PUBLIC_SUPABASE_URL must be a valid HTTPS URL');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export function logEnvironmentStatus(): void {
  const validation = validatePaymentEnvironment();

  if (!validation.valid) {
    validation.errors.forEach(error => console.error(`  - ${error}`));
  }

  if (validation.warnings.length > 0) {
    validation.warnings.forEach(warning => console.warn(`  - ${warning}`));
  }
}

// Auto-validate on import in production
if (process.env.NODE_ENV !== 'development') {
  const validation = validatePaymentEnvironment();
  if (!validation.valid) {
    validation.errors.forEach(error => console.error(`  - ${error}`));
    // Don't throw in production to avoid complete app failure, but log critically
  }
}