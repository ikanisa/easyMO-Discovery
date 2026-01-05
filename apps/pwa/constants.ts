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
  // Additional icons used throughout the app
  Sparkles,
  File,
  Map,
  Camera,
  Paperclip,
  Radio,
  Filter,
  Navigation,
  Truck,
  Bus,
  CarTaxiFront,
  MoreHorizontal,
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

  // Vehicle variants (used in Discovery)
  Moto: Bike,       // Motorcycle
  Taxi: CarTaxiFront, // Taxi/Cab
  Sedan: Car,       // Standard car
  Pickup: Truck,    // Pickup truck
  Bus,              // Bus

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
  Filter,

  // Communication
  Phone,
  Chat: MessageCircle,
  WhatsApp: MessageCircle, // Using MessageCircle as WhatsApp placeholder
  Broadcast: Radio,        // For broadcasting feature

  // Location/Time
  MapPin,
  Clock,
  Map,
  Navigation,

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

  // Files & Media
  File,
  Camera,
  PaperClip: Paperclip,

  // Misc
  RefreshCcw,
  Sparkles,
  MoreHorizontal,
} as const;

