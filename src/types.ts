export type Community = {
  id: string;
  color: string;
  members: string;
  online: string;
  description: string;
};

export type Comment = {
  id: string;
  author: string;
  time: string;
  body: string;
  score: number;
};

export type MyVote = 1 | -1 | 0;

export type Post = {
  id: string;
  communityId: string;
  author: string;
  time: string;
  hoursAgo: number;
  title: string;
  body: string;
  /** Base score, without the signed-in user's own vote. */
  score: number;
  commentCount: number;
  myVote: MyVote;
  comments?: Comment[];
};

export type AiAnswer = {
  text: string;
  refs: string[];
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'ai';
  text: string;
  refs?: string[];
};
