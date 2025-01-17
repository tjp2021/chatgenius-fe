'use client';

import {
  AlertCircle,
  Brain,
  Check,
  ChevronLeft,
  ChevronRight,
  Command,
  CreditCard,
  File,
  FileText,
  HelpCircle,
  Image,
  Laptop,
  Loader2,
  MessageSquare,
  Moon,
  MoreVertical,
  Paperclip,
  Pizza,
  Plus,
  Settings,
  SunMedium,
  Trash,
  Twitter,
  User,
  X,
  Send
} from "lucide-react"

export const Icons = {
  logo: Command,
  close: X,
  spinner: Loader2,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  trash: Trash,
  post: FileText,
  page: File,
  media: Image,
  settings: Settings,
  billing: CreditCard,
  ellipsis: MoreVertical,
  add: Plus,
  warning: AlertCircle,
  user: User,
  arrowRight: ChevronRight,
  help: HelpCircle,
  pizza: Pizza,
  sun: SunMedium,
  moon: Moon,
  laptop: Laptop,
  paperclip: Paperclip,
  brain: Brain,
  send: Send,
  loader: Loader2,
  twitter: Twitter,
  check: Check,
  messageSquare: MessageSquare,
  plus: Plus,
} as const 