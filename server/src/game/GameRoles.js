export const GameRoles = {
  mafia: {
    name: '마피아',
    team: 'mafia',
    description: '밤에 시민 한 명을 제거할 수 있습니다.',
    color: '#e94560',
    icon: '🔪',
    nightAction: true,
    actionType: 'kill',
    winCondition: '마피아의 수가 시민의 수보다 많거나 같아지면 승리'
  },

  citizen: {
    name: '시민',
    team: 'citizen',
    description: '특별한 능력은 없지만, 낮에 투표로 마피아를 찾아야 합니다.',
    color: '#4ecdc4',
    icon: '👤',
    nightAction: false,
    actionType: null,
    winCondition: '모든 마피아를 제거하면 승리'
  },

  doctor: {
    name: '의사',
    team: 'citizen',
    description: '밤에 한 명을 선택해 마피아의 공격으로부터 보호할 수 있습니다.',
    color: '#2ecc71',
    icon: '💉',
    nightAction: true,
    actionType: 'heal',
    winCondition: '모든 마피아를 제거하면 승리'
  },

  police: {
    name: '경찰',
    team: 'citizen',
    description: '밤에 한 명을 조사하여 마피아인지 확인할 수 있습니다.',
    color: '#3498db',
    icon: '👮',
    nightAction: true,
    actionType: 'investigate',
    winCondition: '모든 마피아를 제거하면 승리'
  }
};

export const getRolesByTeam = (team) => {
  return Object.entries(GameRoles)
    .filter(([_, role]) => role.team === team)
    .map(([key, role]) => ({ id: key, ...role }));
};

export const getDefaultRoleDistribution = (playerCount) => {
  if (playerCount < 4) {
    return null; // 최소 4명 필요
  }

  // 기본 역할 분배 (플레이어 수에 따라)
  const distributions = {
    4: { mafia: 1, doctor: 0, police: 1, citizen: 2 },
    5: { mafia: 1, doctor: 1, police: 1, citizen: 2 },
    6: { mafia: 2, doctor: 1, police: 1, citizen: 2 },
    7: { mafia: 2, doctor: 1, police: 1, citizen: 3 },
    8: { mafia: 2, doctor: 1, police: 1, citizen: 4 },
    9: { mafia: 2, doctor: 1, police: 1, citizen: 5 },
    10: { mafia: 3, doctor: 1, police: 1, citizen: 5 },
    11: { mafia: 3, doctor: 1, police: 1, citizen: 6 },
    12: { mafia: 3, doctor: 1, police: 1, citizen: 7 },
  };

  return distributions[playerCount] || {
    mafia: Math.floor(playerCount / 3),
    doctor: 1,
    police: 1,
    citizen: playerCount - Math.floor(playerCount / 3) - 2
  };
};
