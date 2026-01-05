/**
 * App Metadata for ChatGPT Apps SDK
 * 
 * Per OpenAI Apps SDK guidelines:
 * - https://developers.openai.com/apps-sdk/guides/optimize-metadata
 * - https://developers.openai.com/apps-sdk/app-submission-guidelines
 */

export interface AppMetadata {
  name: string;
  description: string;
  shortDescription: string;
  version: string;
  homepage: string;
  supportUrl?: string;
  privacyPolicyUrl?: string;
  termsOfServiceUrl?: string;
  categories: string[];
  useCases: UseCase[];
  screenshots: Screenshot[];
  capabilities: Capability[];
  requirements: Requirement[];
}

export interface UseCase {
  title: string;
  description: string;
  exampleQuery: string;
}

export interface Screenshot {
  url: string;
  alt: string;
  caption?: string;
}

export interface Capability {
  type: 'know' | 'do' | 'show';
  description: string;
  examples: string[];
}

export interface Requirement {
  type: 'location' | 'auth' | 'permission';
  description: string;
  required: boolean;
}

/**
 * App metadata for easyMO Discovery
 */
export const appMetadata: AppMetadata = {
  name: 'easyMO Discovery',
  description: `easyMO Discovery is a comprehensive platform for mobility, marketplace, and payment services in Rwanda. 

**Mobility Services:**
- Find and match with drivers/passengers for rides
- Real-time presence and location-based matching
- Ride intent creation and management

**Marketplace Services:**
- Search for businesses, products, and services
- Create and manage listings
- Location-based business discovery

**Payment Services:**
- Mobile Money (Momo) payment processing
- QR code generation and scanning
- Payment verification

All services are designed for the Rwandan market with support for local payment methods and transportation networks.`,
  
  shortDescription: 'Mobility, marketplace, and payment services for Rwanda',
  
  version: '1.0.0',
  homepage: 'https://easymo.discovery',
  supportUrl: 'https://easymo.discovery/support',
  privacyPolicyUrl: 'https://easymo.discovery/privacy',
  termsOfServiceUrl: 'https://easymo.discovery/terms',
  
  categories: [
    'Mobility',
    'Marketplace',
    'Payments',
    'Location Services',
  ],
  
  useCases: [
    {
      title: 'Find a Ride',
      description: 'Request a ride by creating a ride intent. The system will automatically find nearby drivers and create matches.',
      exampleQuery: 'I need a ride from Kigali Airport to the city center',
    },
    {
      title: 'Search for Businesses',
      description: 'Find nearby businesses, restaurants, pharmacies, and other services using location-based search.',
      exampleQuery: 'Find restaurants near me',
    },
    {
      title: 'Process Mobile Money Payment',
      description: 'Generate QR codes for Mobile Money payments or verify payment status.',
      exampleQuery: 'Generate a QR code for a 5000 RWF payment',
    },
    {
      title: 'Get Location Information',
      description: 'Convert addresses to coordinates or get ETA estimates between locations.',
      exampleQuery: 'What is the ETA from Kigali to Musanze?',
    },
  ],
  
  screenshots: [
    {
      url: 'https://easymo.discovery/screenshots/ride-matching.png',
      alt: 'Ride matching interface showing driver and passenger matches',
      caption: 'Real-time ride matching with location-based suggestions',
    },
    {
      url: 'https://easymo.discovery/screenshots/marketplace-search.png',
      alt: 'Marketplace search results showing businesses',
      caption: 'Location-based business discovery',
    },
    {
      url: 'https://easymo.discovery/screenshots/payment-qr.png',
      alt: 'QR code for Mobile Money payment',
      caption: 'Mobile Money payment processing',
    },
  ],
  
  capabilities: [
    {
      type: 'know',
      description: 'Access real-time location data, business listings, and user presence information',
      examples: [
        'Find nearby drivers or passengers',
        'Search for businesses by category and location',
        'Get current user presence status',
      ],
    },
    {
      type: 'do',
      description: 'Take actions on behalf of users including creating ride intents, listings, and processing payments',
      examples: [
        'Create ride intents for passengers',
        'Set user presence (online/offline)',
        'Generate QR codes for payments',
        'Create marketplace listings',
      ],
    },
    {
      type: 'show',
      description: 'Present structured information in clear formats including match results, business listings, and payment status',
      examples: [
        'Display driver/passenger matches in structured format',
        'Show business listings with location and contact info',
        'Present payment QR codes and status',
      ],
    },
  ],
  
  requirements: [
    {
      type: 'location',
      description: 'Location access is required for ride matching, business search, and geocoding services. Coordinates are sanitized to ~100m precision for privacy.',
      required: true,
    },
    {
      type: 'auth',
      description: 'User authentication is required to access personalized services and create ride intents or listings.',
      required: true,
    },
    {
      type: 'permission',
      description: 'No special permissions required beyond location and authentication.',
      required: false,
    },
  ],
};

/**
 * Get app metadata as JSON
 */
export function getAppMetadata(): AppMetadata {
  return appMetadata;
}

/**
 * Get app metadata for OpenAI Apps SDK submission
 */
export function getSubmissionMetadata() {
  return {
    name: appMetadata.name,
    description: appMetadata.description,
    short_description: appMetadata.shortDescription,
    version: appMetadata.version,
    homepage: appMetadata.homepage,
    support_url: appMetadata.supportUrl,
    privacy_policy_url: appMetadata.privacyPolicyUrl,
    terms_of_service_url: appMetadata.termsOfServiceUrl,
    categories: appMetadata.categories,
    use_cases: appMetadata.useCases.map(uc => ({
      title: uc.title,
      description: uc.description,
      example_query: uc.exampleQuery,
    })),
    screenshots: appMetadata.screenshots.map(ss => ({
      url: ss.url,
      alt: ss.alt,
      caption: ss.caption,
    })),
    capabilities: appMetadata.capabilities.map(cap => ({
      type: cap.type,
      description: cap.description,
      examples: cap.examples,
    })),
    requirements: appMetadata.requirements.map(req => ({
      type: req.type,
      description: req.description,
      required: req.required,
    })),
  };
}

