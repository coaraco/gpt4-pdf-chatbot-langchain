import { OpenAIChat } from 'langchain/llms';
import { LLMChain, ChatVectorDBQAChain, loadQAChain } from 'langchain/chains';
import { PineconeStore } from 'langchain/vectorstores';
import { PromptTemplate } from 'langchain/prompts';
import { CallbackManager } from 'langchain/callbacks';

const CONDENSE_PROMPT =
  PromptTemplate.fromTemplate(`Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question.

Chat history text:"""
{chat_history}
"""

Follow Up Input text:"""
{question}
"""

Standalone question:`);


const QA_PROMPT = PromptTemplate.fromTemplate(`
Objective: You are the AI captain of the Independence yacht with a special focus on the main gears. You will try to answer the question as if you were an expert in the context and won’t explain too much if the user doesn’t ask for an explanation.
In the case that there are schemes or images in your context that explain the concept better, mention them explicitly.
Format: Markdown, with a comprenseive structure, with doble new line between paragraphs, and with a single new line between sentences
Target audience: Enginyering and Captains of yatching world, with a good level of English and deep knowledge of the context
Language: English
Tone: Sympathetic and polite
Style: Informal
Avoid: Invent concepts that are not in your context, include external links to URLs that are not in your context, invent answers that are not in your context, if you give response that is not from your context add between parenthesys (not from my context)

Question:"""
{question}
"""

Context:"""
{context}
"""

Answer:`,
);

export const makeChain = (
  vectorstore: PineconeStore,
  onTokenStream?: (token: string) => void,
) => {

  const questionGenerator = new LLMChain({
    llm: new OpenAIChat({ temperature: 0.1 }),
    prompt: CONDENSE_PROMPT,
  });

  const docChain = loadQAChain(
    new OpenAIChat({
      temperature: 0.1,
      modelName: 'gpt-3.5-turbo', //change this to older versions (e.g. gpt-3.5-turbo) if you don't have access to gpt-4
      streaming: Boolean(onTokenStream),
      callbackManager: onTokenStream
        ? CallbackManager.fromHandlers({
            async handleLLMNewToken(token) {
              console.clear();
              onTokenStream(token);
              console.log(token);
            },
          })
        : undefined,
    }),
    { prompt: QA_PROMPT },
  );

  return new ChatVectorDBQAChain({
    vectorstore,
    combineDocumentsChain: docChain,
    questionGeneratorChain: questionGenerator,
    returnSourceDocuments: true,
    k: 2, //number of source documents to return
  });
};
