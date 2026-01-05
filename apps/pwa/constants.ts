/**
 * PWA-specific constants
 * ICONS object uses lucide-react components
 */

// Re-export shared constants (except ICONS which we override with React components)
export { ROLES, VEHICLE_TYPES, AGENT_TYPES, DEFAULT_LOCATION, DEFAULT_RADIUS_KM } from '@easymo/shared/constants';

// Import lucide-react icons for PWA usage
import {
  Home,
  Bike,
  Car,
  Store,
  Settings,
  Grid,
  XCircle,
  X,
  Check,
  Copy,
  Share2,
  Phone,
  MapPin,
  Clock,
  Tag,
  DollarSign,
  Info,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ArrowRight,
  ArrowLeft,
  Send,
  Mic,
  QrCode,
  CreditCard,
  User,
  Users,
  MessageCircle,
  ScanLine,
  Building,
  RefreshCcw,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';

/**
 * ICONS object containing lucide-react icon components
 * Used throughout the PWA for consistent iconography
 */
export const ICONS = {
  // Navigation
  Home,
  Settings,
  Grid,

  // Transport
  Bike,
  Car,

  // Business
  Store,
  Building,

  // Actions
  Check,
  XMark: X,
  Copy,
  Share: Share2,
  Send,
  Microphone: Mic,
  Scan: ScanLine,

  // Communication
  Phone,
  Chat: MessageCircle,

  // Location/Time
  MapPin,
  Clock,

  // Commerce
  Tag,
  DollarSign,
  CreditCard,
  QrCode,

  // Info
  Info,
  AlertTriangle,
  ExternalLink,

  // Navigation arrows
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ArrowRight,
  ArrowLeft,

  // Users
  User,
  Users,

  // Misc
  RefreshCcw,
} as const;
