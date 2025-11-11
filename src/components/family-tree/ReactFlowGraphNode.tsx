import React from 'react';
import type { NodeProps } from 'reactflow';
import { GraphNode } from './GraphNode';
import { useFamilyTreeStore } from '@/stores/familyTreeStore';
import type { FamilyMember } from '@/types';

type Data = { member: FamilyMember };

export const ReactFlowGraphNode: React.FC<NodeProps<Data>> = ({ data }) => {
  const selectPerson = useFamilyTreeStore(state => state.selectPerson);
  const selectedPersonId = useFamilyTreeStore(state => state.selectedPersonId);

  return (
    <GraphNode
      member={data.member}
      onClick={() => selectPerson(data.member.id)}
      isSelected={selectedPersonId === data.member.id}
    />
  );
};
