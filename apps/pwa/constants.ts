/**
 * PWA-specific constants
 * ICONS object uses lucide-react components
 */

// Re-export shared constants (except ICONS which we override with React components)
export { ROLES, VEHICLE_TYPES, AGENT_TYPES, DEFAULT_LOCATION, DEFAULT_RADIUS_KM } from '@easymo/shared/constants';

// Import lucide-react icons for PWA usage
import {
  // Navigation & Layout
  Home,
  Settings,
  Grid,
  Menu,

  // Transport
  Bike,
  Car,
  Truck,
  Bus,
  CarTaxiFront,

  // Business & Buildings
  Store,
  Building,
  Briefcase,

  // Actions
  Check,
  X,
  Copy,
  Share2,
  Send,
  Mic,
  ScanLine,
  Filter,
  Search,
  Trash2,
  PlusCircle,
  RefreshCcw,
  RotateCcw,

  // Communication
  Phone,
  MessageCircle,
  Bell,
  Radio,
  Headphones,

  // Location/Time
  MapPin,
  Clock,
  Map,
  Navigation,
  Globe,
  Calendar,

  // Commerce
  Tag,
  DollarSign,
  CreditCard,
  QrCode,

  // Info & Status
  Info,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Star,

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
  Paperclip,

  // Real Estate
  Bath,
  Bed,

  // Categories
  Utensils,
  GraduationCap,
  Scale,

  // Theme
  Moon,
  Sun,

  // Misc
  Sparkles,
  MoreHorizontal,
  XCircle,
} from 'lucide-react';

/**
 * ICONS object containing lucide-react icon components
 * Used throughout the PWA for consistent iconography
 * 
 * Note: Some icons have aliases to match the naming used in components
 */
export const ICONS = {
  // Navigation & Layout
  Home,
  Settings,
  Grid,
  Menu,

  // Transport
  Bike,
  Car,

  // Vehicle variants (used in Discovery)
  Moto: Bike,         // Motorcycle
  Taxi: CarTaxiFront, // Taxi/Cab
  Sedan: Car,         // Standard car
  Pickup: Truck,      // Pickup truck
  Bus,                // Bus

  // Business & Buildings
  Store,
  Building,
  Briefcase,

  // Actions
  Check,
  XMark: X,
  Copy,
  Share: Share2,
  Send,
  Microphone: Mic,
  Scan: ScanLine,
  Filter,
  Search,
  Trash: Trash2,
  PlusCircle,
  RefreshCcw,
  Repeat: RotateCcw,

  // Communication
  Phone,
  Chat: MessageCircle,
  WhatsApp: MessageCircle, // Using MessageCircle as WhatsApp placeholder
  Broadcast: Radio,        // For broadcasting feature
  Bell,
  Support: Headphones,     // Customer support

  // Location/Time
  MapPin,
  Clock,
  Map,
  Navigation,
  Globe,
  Calendar,

  // Commerce
  Tag,
  DollarSign,
  CreditCard,
  QrCode,
  QRCode: QrCode, // Alias for different casing in code

  // Info & Status
  Info,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Star,

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

  // Real Estate
  Bath,
  Bed,

  // Categories
  Utensils,
  School: GraduationCap,
  Scale,

  // Theme
  Moon,
  Sun,

  // Misc
  Sparkles,
  MoreHorizontal,
} as const;
