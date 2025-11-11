import React from 'react';
import { FamilyMember } from '@/types';
import { cn } from '@/utils/cn';
import { Gender } from '@/types';

interface GraphNodeProps {
  member: FamilyMember;
  width?: number;
  height?: number;
  onClick?: (member: FamilyMember) => void;
  isSelected?: boolean;
}

export const GraphNode: React.FC<GraphNodeProps> = ({ member, width = 140, height = 56, onClick, isSelected = false }) => {
  const initials = member.name ? member.name.split(' ').map(s => s.charAt(0)).slice(0,2).join('') : '?';

  const getBg = () => {
    switch (member.gender) {
      case Gender.MALE:
        return 'bg-family-male';
      case Gender.FEMALE:
        return 'bg-family-female';
      default:
        return 'bg-family-neutral';
    }
  };

  return (
    <div
      onClick={() => onClick?.(member)}
      role="button"
      title={member.name}
      style={{ width, height }}
      className={cn(
        'rounded-lg border p-2 flex items-center space-x-2 text-sm cursor-pointer shadow',
        isSelected ? 'ring-2 ring-yellow-400' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
      )}
    >
      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${getBg()}`}>
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-xs truncate" style={{ lineHeight: 1.0 }}>{member.name}</div>
        {member.directRelationLabel && (
          <div className="text-xs text-gray-500 truncate" style={{ lineHeight: 1.0 }}>{member.directRelationLabel}</div>
        )}
      </div>
    </div>
  );
};
