export const outfitSlotOrder = ["head", "accessory", "outer", "top", "bottom", "bag", "shoes"] as const;

export type OutfitGender = "female" | "male";
export type OutfitSlotKind = (typeof outfitSlotOrder)[number];
export type OutfitSlot = {
  kind: OutfitSlotKind;
  label: string;
  name: string;
  price: number;
  icon: string;
};
export type OutfitLook = {
  id: string;
  gender: OutfitGender;
  title: string;
  reason: string;
  palette: {
    hair: string;
    skin: string;
    top: string;
    outer: string;
    bottom: string;
    shoes: string;
    accent: string;
  };
  slots: Record<OutfitSlotKind, OutfitSlot>;
};

const labels: Record<OutfitSlotKind, string> = {
  head: "모자",
  accessory: "액세서리",
  outer: "아우터",
  top: "상의",
  bottom: "하의",
  bag: "가방",
  shoes: "신발",
};

const icons: Record<OutfitSlotKind, string> = {
  head: "◒",
  accessory: "◇",
  outer: "♧",
  top: "▤",
  bottom: "▥",
  bag: "▣",
  shoes: "◢",
};

const slotNames: Record<OutfitGender, Record<OutfitSlotKind, string[]>> = {
  female: {
    head: ["라피아 버킷햇", "소프트 볼캡", "리본 헤어밴드", "코튼 벙거지", "클린 비니", "니트 보닛", "내추럴 썬캡", "로고 캡", "울 베레", "스트랩 햇"],
    accessory: ["클래식 선글라스", "실버 이어링", "진주 네크리스", "미니 스카프", "볼드 링 세트", "하트 펜던트", "메탈 워치", "컬러 헤어핀", "레더 벨트", "슬림 안경"],
    outer: ["라이트 스윙 재킷", "크롭 윈드브레이커", "쿨링 셔츠 재킷", "린넨 블레이저", "후드 집업", "소프트 가디건", "데님 셔츠", "미니 트렌치", "니트 집업", "경량 베스트"],
    top: ["쿨링 크롭 티", "실켓 반팔 티", "린넨 슬리브리스", "스트라이프 셔츠", "리브 니트 톱", "코튼 블라우스", "피케 카라 티", "레이어드 탱크", "보트넥 티", "시어 셔츠"],
    bottom: ["플리츠 미니 스커트", "와이드 데님", "린넨 쇼츠", "카고 롱스커트", "쿨링 슬랙스", "A라인 스커트", "스트링 팬츠", "버뮤다 팬츠", "새틴 스커트", "크롭 데님"],
    bag: ["미니 나일론 백", "하프문 숄더백", "캔버스 토트", "스트링 백팩", "미니 크로스백", "레더 바스켓백", "포켓 숄더백", "셔링 토트", "버킷 크로스백", "슬림 호보백"],
    shoes: ["라이트 러너", "메리제인 플랫", "레인 스니커즈", "스트랩 샌들", "레트로 러너", "소프트 로퍼", "플랫폼 샌들", "캔버스 스니커즈", "미들 부츠", "발레 플랫"],
  },
  male: {
    head: ["나일론 캠프캡", "클린 볼캡", "코튼 버킷햇", "레터링 캡", "리브 비니", "스트랩 햇", "메시 캠프캡", "울 볼캡", "워시드 캡", "미니멀 비니"],
    accessory: ["스퀘어 선글라스", "실버 체인", "레더 워치", "메탈 안경", "링 세트", "나일론 벨트", "카드 월렛", "메탈 브레이슬릿", "씬 네크리스", "클립 키링"],
    outer: ["라이트 윈드 재킷", "코튼 셔츠 재킷", "시어서커 블레이저", "후드 집업", "유틸리티 베스트", "데님 오버셔츠", "미니멀 블루종", "나일론 아노락", "니트 집업", "경량 트러커"],
    top: ["쿨링 포켓 티", "오버핏 반팔 티", "린넨 셔츠", "피케 카라 티", "스트라이프 티", "리브 슬리브리스", "그래픽 티", "옥스퍼드 셔츠", "소프트 니트", "레이어드 티"],
    bottom: ["와이드 카고 팬츠", "쿨링 슬랙스", "버뮤다 팬츠", "스트레이트 데님", "나일론 쇼츠", "원턱 치노", "스트링 팬츠", "워시드 데님", "린넨 팬츠", "테이퍼드 팬츠"],
    bag: ["슬링 크로스백", "나일론 백팩", "캔버스 토트", "유틸리티 메신저", "미니 숄더백", "드로스트링 백", "포켓 크로스백", "데일리 백팩", "레더 토트", "웨이스트 백"],
    shoes: ["레트로 러너", "캔버스 스니커즈", "레더 샌들", "미니멀 로퍼", "트레일 스니커즈", "코트 스니커즈", "클로그 샌들", "독일군 스니커즈", "첼시 부츠", "라이트 러너"],
  },
};

const lookConfigs: Record<OutfitGender, Array<Omit<OutfitLook, "id" | "gender" | "slots">>> = {
  female: [
    look("노을 산책 레이어드", "낮과 밤의 온도 차에 맞춰 가벼운 재킷과 통기성 좋은 이너를 조합했어요.", "#3f3f46", "#fed7aa", "#fb7185", "#fafafa", "#1e293b", "#ffffff", "#e11d48"),
    look("맑은 날 시티 캐주얼", "햇빛을 가려줄 모자와 오래 걸어도 편안한 러너를 골랐어요.", "#713f12", "#fdba74", "#f59e0b", "#fff7ed", "#334155", "#f8fafc", "#f97316"),
    look("습도 높은 날 쿨링 룩", "습도가 높아 몸에 붙지 않는 소재와 가벼운 하의를 중심으로 구성했어요.", "#27272a", "#fed7aa", "#38bdf8", "#e0f2fe", "#0f172a", "#ffffff", "#0284c7"),
    look("비 오는 날 레인 코디", "갑작스러운 비에 대응하도록 발수 아우터와 젖어도 관리하기 쉬운 신발을 골랐어요.", "#451a03", "#fdba74", "#a78bfa", "#ede9fe", "#312e81", "#475569", "#7c3aed"),
    look("바람 부는 날 미니멀", "바람을 막아주는 얇은 겉옷과 움직임이 편한 하의를 매치했어요.", "#18181b", "#fed7aa", "#94a3b8", "#f8fafc", "#334155", "#ffffff", "#475569"),
    look("포근한 새벽 니트 룩", "서늘한 새벽 공기에 맞춰 얇은 니트와 가디건을 겹쳐 입었어요.", "#854d0e", "#fdba74", "#f9a8d4", "#fdf2f8", "#881337", "#fff1f2", "#db2777"),
    look("주말 피크닉 코디", "낮 동안 활동하기 좋은 가벼운 소재와 밝은 색을 조합했어요.", "#78350f", "#fed7aa", "#86efac", "#f0fdf4", "#166534", "#ffffff", "#16a34a"),
    look("구름 낀 날 모노톤", "흐린 하늘과 자연스럽게 어울리는 모노톤에 포인트 액세서리를 더했어요.", "#18181b", "#fed7aa", "#d4d4d8", "#fafafa", "#27272a", "#ffffff", "#52525b"),
    look("저녁 약속 새틴 포인트", "해가 진 뒤 체감온도를 고려한 아우터와 은은한 광택 소재를 조합했어요.", "#4c1d95", "#fed7aa", "#c4b5fd", "#f5f3ff", "#581c87", "#faf5ff", "#9333ea"),
    look("일교차 큰 날 데님 룩", "낮에는 벗고 밤에는 걸칠 수 있는 데님 셔츠로 일교차에 대비했어요.", "#422006", "#fdba74", "#60a5fa", "#eff6ff", "#1e3a8a", "#ffffff", "#2563eb"),
  ],
  male: [
    look("노을 산책 유틸리티", "서늘해지는 저녁을 위해 가벼운 재킷과 활동적인 팬츠를 조합했어요.", "#27272a", "#fdba74", "#fb7185", "#f8fafc", "#1e293b", "#ffffff", "#e11d48"),
    look("맑은 날 클린 캐주얼", "강한 햇빛과 긴 이동을 고려해 모자와 가벼운 스니커즈를 골랐어요.", "#713f12", "#fdba74", "#f59e0b", "#fff7ed", "#334155", "#ffffff", "#ea580c"),
    look("습한 날 시어서커 룩", "통풍이 잘 되고 몸에 붙지 않는 소재로 습한 날의 불편함을 줄였어요.", "#18181b", "#fed7aa", "#38bdf8", "#e0f2fe", "#0f172a", "#ffffff", "#0284c7"),
    look("비 오는 날 아노락", "발수 아노락과 관리하기 쉬운 팬츠로 비에 대비했어요.", "#451a03", "#fdba74", "#a78bfa", "#ede9fe", "#312e81", "#475569", "#7c3aed"),
    look("바람 부는 날 블루종", "가벼운 블루종으로 바람을 막고 이너는 얇게 유지했어요.", "#18181b", "#fed7aa", "#94a3b8", "#f8fafc", "#334155", "#ffffff", "#475569"),
    look("선선한 새벽 니트", "새벽의 낮은 체감온도에 맞춰 부드러운 니트와 집업을 겹쳤어요.", "#854d0e", "#fdba74", "#c4b5fd", "#f5f3ff", "#312e81", "#ffffff", "#7c3aed"),
    look("주말 공원 카고 룩", "야외 활동에 맞춰 수납이 편한 팬츠와 가벼운 상의를 골랐어요.", "#78350f", "#fdba74", "#86efac", "#f0fdf4", "#166534", "#ffffff", "#16a34a"),
    look("구름 낀 날 그레이 톤", "흐린 날과 어울리는 차분한 색에 금속 액세서리로 포인트를 줬어요.", "#18181b", "#fdba74", "#d4d4d8", "#fafafa", "#27272a", "#ffffff", "#52525b"),
    look("저녁 약속 셔츠 룩", "밤의 서늘함을 고려해 셔츠와 얇은 겉옷을 함께 구성했어요.", "#422006", "#fed7aa", "#fda4af", "#fff1f2", "#4c0519", "#ffffff", "#be123c"),
    look("일교차 대응 데님", "낮과 밤의 온도 차에 대응하기 쉬운 오버셔츠를 중심으로 골랐어요.", "#27272a", "#fdba74", "#60a5fa", "#eff6ff", "#1e3a8a", "#ffffff", "#2563eb"),
  ],
};

export const outfitLooksByGender: Record<OutfitGender, OutfitLook[]> = {
  female: createLooks("female"),
  male: createLooks("male"),
};

function createLooks(gender: OutfitGender): OutfitLook[] {
  return lookConfigs[gender].map((config, index) => ({
    ...config,
    id: `${gender}-look-${index + 1}`,
    gender,
    slots: Object.fromEntries(outfitSlotOrder.map((kind, slotIndex) => [kind, {
      kind,
      label: labels[kind],
      name: slotNames[gender][kind][index],
      price: 19_000 + slotIndex * 9_000 + index * 1_500,
      icon: icons[kind],
    }])) as Record<OutfitSlotKind, OutfitSlot>,
  }));
}

function look(
  title: string,
  reason: string,
  hair: string,
  skin: string,
  top: string,
  outer: string,
  bottom: string,
  shoes: string,
  accent: string,
): Omit<OutfitLook, "id" | "gender" | "slots"> {
  return { title, reason, palette: { hair, skin, top, outer, bottom, shoes, accent } };
}
