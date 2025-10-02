export class LiarRoom {
  constructor(io) {
    this.io = io;
    this.id = this.generateRoomId();
    this.players = new Map(); // socketId -> Player
    this.chatMessages = [];
    this.status = 'waiting'; // waiting, turn_chat, free_chat, voting, keyword_guess, finished
    this.currentTurn = 0;
    this.liarId = null;
    this.keyword = null;
    this.category = null;
    this.turnOrder = [];
    this.phaseTimer = null;
    this.votes = new Map();
    this.turnMessages = [];
  }

  generateRoomId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  addPlayer(socketId, name, isHost = false) {
    const player = {
      id: socketId,
      name,
      isHost,
      isLiar: false,
      hasVoted: false,
      votedFor: null
    };
    this.players.set(socketId, player);
  }

  removePlayer(socketId) {
    this.players.delete(socketId);
  }

  startGame() {
    if (this.players.size < 3) return { success: false, message: '최소 3명이 필요합니다.' };

    this.status = 'turn_chat';

    // 랜덤으로 라이어 선정
    const playerIds = Array.from(this.players.keys());
    this.liarId = playerIds[Math.floor(Math.random() * playerIds.length)];

    // 카테고리와 키워드 선택
    const { category, keyword } = this.selectRandomKeyword();
    this.category = category;
    this.keyword = keyword;

    // 턴 순서 섞기
    this.turnOrder = this.shuffleArray(playerIds);
    this.currentTurn = 0;

    // 각 플레이어에게 역할 전송
    this.players.forEach((player, socketId) => {
      const isLiar = socketId === this.liarId;
      player.isLiar = isLiar;

      this.io.to(socketId).emit('liarGameStarted', {
        keyword: isLiar ? '???' : keyword,
        category: category,
        isLiar: isLiar,
        turnOrder: this.turnOrder.map(id => this.players.get(id).name)
      });
    });

    // 첫 턴 시작
    this.startTurn();

    return { success: true };
  }

  selectRandomKeyword() {
    const categories = Object.keys(KEYWORDS);
    const category = categories[Math.floor(Math.random() * categories.length)];
    const keywords = KEYWORDS[category];
    const keyword = keywords[Math.floor(Math.random() * keywords.length)];
    return { category, keyword };
  }

  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  startTurn() {
    const currentPlayerId = this.turnOrder[this.currentTurn];
    const turnDuration = 15; // 15초

    this.io.to(this.id).emit('liarTurnChanged', {
      currentPlayerIndex: this.currentTurn,
      currentPlayerId: currentPlayerId,
      timeLeft: turnDuration
    });

    // 타이머 설정
    if (this.phaseTimer) clearTimeout(this.phaseTimer);
    this.phaseTimer = setTimeout(() => {
      this.nextTurn();
    }, turnDuration * 1000);
  }

  nextTurn() {
    this.currentTurn++;

    if (this.currentTurn >= this.turnOrder.length) {
      // 모든 턴 종료, 자유 토론 시작
      this.startFreeChat();
    } else {
      this.startTurn();
    }
  }

  sendTurnMessage(playerId, message) {
    const player = this.players.get(playerId);
    if (!player) return;

    const msg = {
      id: Date.now(),
      playerName: player.name,
      message,
      timestamp: new Date(),
      type: 'turn'
    };

    this.chatMessages.push(msg);
    this.turnMessages.push(msg);
    this.io.to(this.id).emit('liarChatMessage', msg);

    // 자동으로 다음 턴
    this.nextTurn();
  }

  startFreeChat() {
    this.status = 'free_chat';
    const duration = 120; // 2분

    this.io.to(this.id).emit('liarFreeChatStarted', { duration });

    if (this.phaseTimer) clearTimeout(this.phaseTimer);
    this.phaseTimer = setTimeout(() => {
      this.startVoting();
    }, duration * 1000);
  }

  sendFreeMessage(playerId, message) {
    const player = this.players.get(playerId);
    if (!player) return;

    const msg = {
      id: Date.now(),
      playerName: player.name,
      message,
      timestamp: new Date(),
      type: 'free'
    };

    this.chatMessages.push(msg);
    this.io.to(this.id).emit('liarChatMessage', msg);
  }

  startVoting() {
    this.status = 'voting';
    this.votes.clear();
    const duration = 30; // 30초

    this.io.to(this.id).emit('liarVotingStarted', { duration });

    if (this.phaseTimer) clearTimeout(this.phaseTimer);
    this.phaseTimer = setTimeout(() => {
      this.processVotes();
    }, duration * 1000);
  }

  vote(voterId, targetId) {
    const voter = this.players.get(voterId);
    if (!voter || voter.hasVoted) return;

    voter.hasVoted = true;
    voter.votedFor = targetId;
    this.votes.set(voterId, targetId);

    // 모두 투표했는지 확인
    if (this.votes.size === this.players.size) {
      if (this.phaseTimer) clearTimeout(this.phaseTimer);
      this.processVotes();
    }
  }

  processVotes() {
    const voteCounts = new Map();

    this.votes.forEach(targetId => {
      voteCounts.set(targetId, (voteCounts.get(targetId) || 0) + 1);
    });

    let maxVotes = 0;
    let suspectedLiarId = null;

    voteCounts.forEach((votes, playerId) => {
      if (votes > maxVotes) {
        maxVotes = votes;
        suspectedLiarId = playerId;
      }
    });

    // 라이어를 맞췄는지 확인
    if (suspectedLiarId === this.liarId) {
      // 라이어가 제시어 맞추기 시도
      this.status = 'keyword_guess';
      this.io.to(this.id).emit('liarKeywordGuess', { liarId: this.liarId });
    } else {
      // 라이어를 못 찾음 - 라이어 승리
      this.endGame('liar', false);
    }
  }

  guessKeyword(liarId, guessedKeyword) {
    if (liarId !== this.liarId) return;

    const correct = guessedKeyword.toLowerCase().trim() === this.keyword.toLowerCase().trim();

    if (correct) {
      // 라이어 승리
      this.endGame('liar', true);
    } else {
      // 시민 승리
      this.endGame('citizen', false);
    }
  }

  endGame(winner, guessedCorrectly) {
    this.status = 'finished';
    const liarPlayer = this.players.get(this.liarId);

    this.io.to(this.id).emit('liarGameEnd', {
      winner,
      liarPlayer: {
        id: liarPlayer.id,
        name: liarPlayer.name
      },
      keyword: this.keyword,
      category: this.category,
      guessedCorrectly
    });

    if (this.phaseTimer) clearTimeout(this.phaseTimer);
  }

  getState() {
    return {
      id: this.id,
      status: this.status,
      players: Array.from(this.players.values()).map(p => ({
        id: p.id,
        name: p.name,
        isHost: p.isHost
      })),
      chatMessages: this.chatMessages
    };
  }
}

// 카테고리별 키워드 (10개 카테고리, 각 10개씩 = 100개)
const KEYWORDS = {
  '직업': ['의사', '변호사', '교사', '요리사', '경찰', '소방관', '가수', '배우', '프로그래머', '디자이너'],
  '동물': ['강아지', '고양이', '코끼리', '기린', '사자', '호랑이', '토끼', '햄스터', '앵무새', '금붕어'],
  '음식': ['피자', '치킨', '햄버거', '떡볶이', '김치찌개', '스파게티', '초밥', '라면', '삼겹살', '비빔밥'],
  '나라': ['한국', '미국', '일본', '중국', '프랑스', '영국', '독일', '이탈리아', '스페인', '호주'],
  '스포츠': ['축구', '야구', '농구', '배구', '테니스', '골프', '수영', '태권도', '복싱', '탁구'],
  '과일': ['사과', '바나나', '포도', '딸기', '수박', '오렌지', '키위', '망고', '복숭아', '체리'],
  '색상': ['빨강', '파랑', '노랑', '초록', '검정', '흰색', '보라', '분홍', '주황', '회색'],
  '교통수단': ['자동차', '버스', '지하철', '비행기', '기차', '배', '자전거', '오토바이', '택시', '헬리콥터'],
  '가전제품': ['냉장고', '세탁기', '전자레인지', '에어컨', '청소기', 'TV', '컴퓨터', '스마트폰', '선풍기', '공기청정기'],
  '계절/날씨': ['봄', '여름', '가을', '겨울', '비', '눈', '바람', '태풍', '무지개', '번개']
};
