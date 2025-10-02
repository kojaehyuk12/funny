# 🎭 마피아 게임 (Mafia Game)

실시간 채팅이 가능한 웹 기반 마피아 게임입니다.

## ✨ 주요 기능

- 🗣️ **실시간 채팅** - 플레이어 간 실시간 대화
- ⏰ **시간 관리** - 낮/밤 페이즈 전환 및 시간 단축
- 👥 **인원 설정** - 4~16명 사용자 설정 가능
- 🎭 **다양한 직업** - 마피아, 시민, 의사, 경찰 등
- 🗳️ **투표 시스템** - 민주적 투표로 용의자 처형
- 🎯 **능력 사용** - 직업별 특수 능력

## 🛠️ 기술 스택

### Frontend
- React 19
- Vite 7
- Socket.io Client
- Tailwind CSS 3

### Backend
- Node.js
- Express 4
- Socket.io 4

## 🚀 빠른 시작

### 1. 전체 설치 및 실행

```bash
# 1. 저장소 클론
git clone https://github.com/kojaehyuk12/funny.git
cd funny

# 2. 모든 의존성 설치
npm run install:all

# 3. 개발 서버 실행 (클라이언트 + 서버 동시)
npm run dev
```

**접속 URL:**
- 클라이언트: http://localhost:5173
- 서버: http://localhost:3000

### 2. 개별 실행

#### 서버만 실행
```bash
cd server
npm install
npm run dev
```

#### 클라이언트만 실행
```bash
cd client
npm install
npm run dev
```

## 🎮 게임 플레이 방법

### 1. 방 만들기
1. 닉네임 입력
2. "방 만들기" 클릭
3. 게임 설정 조정 (인원, 시간 등)
4. 방 코드를 친구들에게 공유

### 2. 방 참가하기
1. 닉네임 입력
2. 방 코드 입력
3. "방 참가하기" 클릭

### 3. 게임 시작
1. 방장이 플레이어가 모이면 "게임 시작" 버튼 클릭
2. 각자 역할 확인
3. 밤/낮 페이즈에 따라 행동

## 📦 배포

### GitHub Pages (Frontend)
```bash
# 자동 배포 (main 브랜치에 push 시)
git add .
git commit -m "Deploy"
git push origin main
```

### 서버 배포 (Render/Railway 권장)

#### Render
1. [Render](https://render.com) 가입
2. New Web Service 클릭
3. 저장소 연결
4. 설정:
   - Root Directory: `server`
   - Build Command: `npm install`
   - Start Command: `npm start`
5. 환경 변수 설정:
   - `CLIENT_URL`: GitHub Pages URL

#### Railway
1. [Railway](https://railway.app) 가입
2. New Project → Deploy from GitHub
3. 저장소 선택
4. 환경 변수 설정

## 🔧 환경 변수 설정

### 클라이언트 (.env)
```bash
cp client/.env.example client/.env
```

```env
VITE_SERVER_URL=http://localhost:3000  # 개발
# VITE_SERVER_URL=https://your-server.com  # 프로덕션
```

### 서버 (.env)
```bash
cp server/.env.example server/.env
```

```env
PORT=3000
CLIENT_URL=http://localhost:5173  # 개발
# CLIENT_URL=https://your-username.github.io/funny  # 프로덕션
```

## 🎮 게임 규칙

1. **게임 시작** - 플레이어들이 로비에 모이고 준비 완료
2. **직업 배정** - 랜덤으로 마피아와 시민 진영 직업 배정
3. **밤 페이즈** - 마피아는 시민을 제거하고, 특수 직업은 능력 사용
4. **낮 페이즈** - 토론 후 투표로 용의자 처형
5. **승리 조건**
   - 마피아 승리: 마피아 수 ≥ 시민 수
   - 시민 승리: 모든 마피아 제거

## 🎭 직업 종류

- **마피아** 🔪 - 밤에 시민 제거
- **시민** 👤 - 투표로 마피아 찾기
- **의사** 💉 - 밤에 한 명 보호
- **경찰** 👮 - 밤에 한 명 조사
- **더 많은 직업 추가 예정...**

## 📝 라이선스

MIT License
