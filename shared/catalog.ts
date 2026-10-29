import type { Feedback } from './types';

export interface Question {
  id: string;
  english: string;
  korean: string;
  starter: string;
  words: string[];
  sample: { answer: string; corrected: string; explanation: string; natural: string; translation: string };
}
export interface Topic {
  id: string;
  name: string;
  english: string;
  description: string;
  questions: Question[];
}
export const topics: Topic[] = [
  {
    id: 'hobbies', name: '취미와 일상', english: 'HOBBIES', description: '좋아하는 것으로 시작해요',
    questions: [
      { id: 'hobbies-1', english: 'What do you like to do after school?', korean: '학교가 끝나면 무엇을 하는 걸 좋아하나요?', starter: 'After school, I like to…', words: ['play basketball', 'listen to music', 'read a book'], sample: { answer: 'I like play basketball with my friends.', corrected: 'I like playing basketball with my friends.', explanation: 'like 뒤에는 playing처럼 -ing 형태를 쓰거나, to play를 쓸 수 있어요.', natural: 'After school, I like to play basketball with my friends.', translation: '학교가 끝나면 친구들과 농구하는 걸 좋아해요.' } },
      { id: 'hobbies-2', english: 'What kind of music do you like?', korean: '어떤 종류의 음악을 좋아하나요?', starter: 'I like… because…', words: ['pop music', 'exciting', 'relaxing'], sample: { answer: 'I likes pop music because it is exciting.', corrected: 'I like pop music because it is exciting.', explanation: '주어가 I일 때는 likes가 아니라 like를 써요.', natural: 'I enjoy listening to pop music. It makes me happy.', translation: '팝 음악 듣는 걸 좋아해요. 기분이 좋아지거든요.' } },
      { id: 'hobbies-3', english: 'What is something you want to try?', korean: '새롭게 도전해 보고 싶은 것이 있나요?', starter: 'I want to try…', words: ['cooking', 'drawing', 'something new'], sample: { answer: 'I want try cooking with my family.', corrected: 'I want to try cooking with my family.', explanation: 'want 다음에 동작을 말할 때는 to를 넣어 want to try라고 해요.', natural: 'I want to try cooking something new with my family.', translation: '가족과 새로운 음식을 만들어 보고 싶어요.' } },
    ],
  },
  {
    id: 'school', name: '학교생활', english: 'SCHOOL', description: '나의 학교 이야기를 해요',
    questions: [
      { id: 'school-1', english: 'What is your favorite subject?', korean: '가장 좋아하는 과목은 무엇인가요?', starter: 'My favorite subject is…', words: ['science', 'English', 'interesting'], sample: { answer: 'My favorite subject science because it is fun.', corrected: 'My favorite subject is science because it is fun.', explanation: '좋아하는 과목이 무엇인지 말할 때 subject 뒤에 is가 필요해요.', natural: 'I like science the most because it is fun.', translation: '재미있어서 과학을 가장 좋아해요.' } },
      { id: 'school-2', english: 'How do you get to school?', korean: '학교에는 어떻게 가나요?', starter: 'I go to school…', words: ['by bus', 'on foot', 'with my friend'], sample: { answer: 'I go to school by walk.', corrected: 'I walk to school.', explanation: '걸어서 간다는 말은 walk to school 또는 go to school on foot으로 표현해요.', natural: 'I usually walk to school.', translation: '저는 보통 학교에 걸어가요.' } },
      { id: 'school-3', english: 'What do you do during lunch break?', korean: '점심시간에는 무엇을 하나요?', starter: 'During lunch break, I…', words: ['chat with friends', 'eat lunch', 'take a walk'], sample: { answer: 'I chat with my friend and plays outside.', corrected: 'I chat with my friend and play outside.', explanation: '주어가 I이므로 chat과 play를 나란히 써요.', natural: 'I have lunch and play outside with my friend.', translation: '점심을 먹고 친구와 밖에서 놀아요.' } },
    ],
  },
  {
    id: 'friends', name: '친구 이야기', english: 'FRIENDS', description: '함께하는 순간을 나눠요',
    questions: [
      { id: 'friends-1', english: 'What do you enjoy doing with your friends?', korean: '친구들과 함께 무엇을 하는 걸 좋아하나요?', starter: 'We enjoy… together.', words: ['playing games', 'talking', 'going for a walk'], sample: { answer: 'We enjoy play games together.', corrected: 'We enjoy playing games together.', explanation: 'enjoy 뒤에 동작이 오면 playing처럼 -ing 형태를 써요.', natural: 'My friends and I like playing games together.', translation: '친구들과 저는 함께 게임하는 걸 좋아해요.' } },
      { id: 'friends-2', english: 'What makes a good friend?', korean: '좋은 친구는 어떤 친구라고 생각하나요?', starter: 'A good friend is someone who…', words: ['kind', 'listens to me', 'helps others'], sample: { answer: 'A good friend listen to me.', corrected: 'A good friend listens to me.', explanation: '한 명의 친구인 a good friend가 주어이므로 listens라고 해요.', natural: 'A good friend is someone who listens to me.', translation: '좋은 친구는 제 말을 들어주는 사람이에요.' } },
      { id: 'friends-3', english: 'How do you help your friends?', korean: '친구들을 어떻게 도와주나요?', starter: 'I help my friends…', words: ['with homework', 'when they feel sad', 'by listening'], sample: { answer: 'I helps my friends with homework.', corrected: 'I help my friends with homework.', explanation: 'I 뒤에는 helps가 아니라 help를 써요.', natural: 'I help my friends when they have trouble with homework.', translation: '친구들이 숙제를 어려워할 때 도와줘요.' } },
    ],
  },
  {
    id: 'food', name: '좋아하는 음식', english: 'FOOD', description: '맛있는 이야기는 언제나 좋아요',
    questions: [
      { id: 'food-1', english: 'What food do you like the most?', korean: '어떤 음식을 가장 좋아하나요?', starter: 'My favorite food is…', words: ['pizza', 'spicy', 'delicious'], sample: { answer: 'My favorite food are pizza.', corrected: 'My favorite food is pizza.', explanation: 'my favorite food는 하나의 대상을 가리키므로 is를 써요.', natural: 'I like pizza the most.', translation: '피자를 가장 좋아해요.' } },
      { id: 'food-2', english: 'What do you usually eat for breakfast?', korean: '아침으로 보통 무엇을 먹나요?', starter: 'I usually have… for breakfast.', words: ['toast', 'rice', 'a glass of milk'], sample: { answer: 'I usually eats toast for breakfast.', corrected: 'I usually eat toast for breakfast.', explanation: '주어가 I일 때는 eats가 아니라 eat를 써요.', natural: 'I usually have toast for breakfast.', translation: '아침으로 보통 토스트를 먹어요.' } },
      { id: 'food-3', english: 'What food would you like to learn to cook?', korean: '어떤 음식을 만드는 법을 배우고 싶나요?', starter: 'I would like to learn to cook…', words: ['pasta', 'fried rice', 'for my family'], sample: { answer: 'I would like learn to cook pasta.', corrected: 'I would like to learn to cook pasta.', explanation: '하고 싶다는 뜻의 would like 뒤에는 to가 필요해요.', natural: 'I want to learn how to make pasta.', translation: '파스타 만드는 법을 배우고 싶어요.' } },
    ],
  },
  {
    id: 'weekend', name: '주말과 여행', english: 'WEEKEND', description: '작은 모험을 이야기해요',
    questions: [
      { id: 'weekend-1', english: 'What did you do last weekend?', korean: '지난 주말에 무엇을 했나요?', starter: 'Last weekend, I…', words: ['went to the park', 'watched a movie', 'stayed home'], sample: { answer: 'Last weekend, I go to the park.', corrected: 'Last weekend, I went to the park.', explanation: '지난 주말의 일이므로 go의 과거형 went를 써요.', natural: 'I went to the park last weekend.', translation: '지난 주말에 공원에 갔어요.' } },
      { id: 'weekend-2', english: 'Where would you like to go on a trip?', korean: '어디로 여행을 가보고 싶나요?', starter: 'I would like to visit…', words: ['Jeju Island', 'the beach', 'with my family'], sample: { answer: 'I want visit Jeju Island.', corrected: 'I want to visit Jeju Island.', explanation: 'want 다음에는 to visit처럼 to를 넣어 동작을 이어줘요.', natural: 'I would like to visit Jeju Island.', translation: '제주도에 가보고 싶어요.' } },
      { id: 'weekend-3', english: 'What are your plans for this weekend?', korean: '이번 주말에는 무엇을 할 계획인가요?', starter: 'This weekend, I am going to…', words: ['meet my friends', 'relax', 'ride my bike'], sample: { answer: 'I am going meet my friends.', corrected: 'I am going to meet my friends.', explanation: '계획을 말할 때는 am going to 다음에 동작을 넣어요.', natural: 'I plan to meet my friends this weekend.', translation: '이번 주말에는 친구들을 만날 계획이에요.' } },
    ],
  },
];

export function sampleFeedback(question: Question): Feedback {
  return {
    praise: '무엇을 이야기하고 싶은지 잘 전해지는 답변이에요. 한 문장으로 시작한 것만으로도 충분해요!',
    grammar: { needsCorrection: true, corrected: question.sample.corrected, explanation: question.sample.explanation },
    expression: { sentence: question.sample.natural, translation: question.sample.translation, explanation: '같은 뜻을 조금 다른 방식으로 말할 수도 있어요. 편하게 느껴지는 표현을 골라보세요.' },
    followUp: { question: 'Can you tell me a little more?', translation: '조금 더 이야기해 줄 수 있나요?' },
    pronunciation: { status: 'not_assessed', observation: '샘플은 실제 녹음이 없어 발음을 평가하지 않아요.', practiceWord: '', tip: '' },
  };
}

export function findQuestion(id: string): Question | undefined {
  return topics.flatMap((topic) => topic.questions).find((question) => question.id === id);
}
