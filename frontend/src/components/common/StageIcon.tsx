import React from 'react';
import {
  Sparkles,
  Compass,
  Palette,
  Rocket,
  Shapes,
  BookOpen,
  Zap,
  Target,
  GraduationCap,
  Calculator,
  Atom,
  Award,
  Flame,
  CheckCircle,
  Timer,
  FileText,
  Star,
  Bookmark,
  Search,
  User,
  Shield,
  Layers,
  LucideProps,
} from 'lucide-react';

interface StageIconProps extends LucideProps {
  name: string;
}

export const StageIcon: React.FC<StageIconProps> = ({ name, ...props }) => {
  switch (name) {
    case 'Sparkles':
      return <Sparkles {...props} />;
    case 'Compass':
      return <Compass {...props} />;
    case 'Palette':
      return <Palette {...props} />;
    case 'Rocket':
      return <Rocket {...props} />;
    case 'Shapes':
      return <Shapes {...props} />;
    case 'BookOpen':
      return <BookOpen {...props} />;
    case 'Zap':
      return <Zap {...props} />;
    case 'Target':
      return <Target {...props} />;
    case 'GraduationCap':
      return <GraduationCap {...props} />;
    case 'Calculator':
      return <Calculator {...props} />;
    case 'Atom':
      return <Atom {...props} />;
    case 'Award':
      return <Award {...props} />;
    case 'Flame':
      return <Flame {...props} />;
    case 'CheckCircle':
      return <CheckCircle {...props} />;
    case 'Timer':
      return <Timer {...props} />;
    case 'FileText':
      return <FileText {...props} />;
    case 'Star':
      return <Star {...props} />;
    case 'Bookmark':
      return <Bookmark {...props} />;
    case 'Search':
      return <Search {...props} />;
    case 'User':
      return <User {...props} />;
    case 'Shield':
      return <Shield {...props} />;
    case 'Layers':
      return <Layers {...props} />;
    default:
      return <BookOpen {...props} />;
  }
};
