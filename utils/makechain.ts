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
Objective: As an expert in Particular specifications of Endesa distribución company for link Facilities Connected to the Distribution Network, you will provide examples and explanations of questions and answers in your field. Always should try to give an example to help to understand the basic concepts and if your have pictures or schemas on your context, add the reference of the picture.
Format: Markdown
Target audience: Non expert people from the context that you have but with some knowledge of very basic electricity concepts
Language: Spanish
Tone: Sympathetic
Style: Informal
Avoid: Invent concepts that are not in your context, include links to URLs that are not in your context, invent answers that are not in your context, if you give response that is not from your context add between parenthesys (not from my context)

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
