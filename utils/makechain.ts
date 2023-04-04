import { OpenAIChat } from 'langchain/llms';
import { LLMChain, ChatVectorDBQAChain, loadQAChain } from 'langchain/chains';
import { PineconeStore } from 'langchain/vectorstores';
import { PromptTemplate } from 'langchain/prompts';
import { CallbackManager } from 'langchain/callbacks';

const CONDENSE_PROMPT =
  PromptTemplate.fromTemplate(`Dado la siguiente conversación y una pregunta de seguimiento, reformula la pregunta de seguimiento para que sea una pregunta independiente.

Historial del chat:
{chat_history}
Sigue el Input: {question}
Pregunta independiente:`);

const QA_PROMPT = PromptTemplate.fromTemplate(
`Eres un asistente de IA que proporciona información y ayuda en base al contexto proporcionado sobre las normativas de electrificación para Endesa.
  Te proporcionan los siguientes fragmentos extraídos de un documento largo y una pregunta.
  Proporciona una respuesta conversacional basada en el contexto proporcionado, con un lenguage formal pero amigable.
  Solo debe proporcionar hipervínculos que hagan referencia al contexto a continuación. NO inventes hipervínculos,
  pero si debes insertar la ubicación de la información en el contexto, entre parentesis indicando la página donde puede encontrarse en el documento.
  Si no puede encontrar la respuesta en el contexto, simplemente diga "Hmm, no estoy seguro", pero no trates de dar una respuesta que no tienes la certeza de responder.
  No intentes inventar una respuesta. Si la pregunta no está relacionada con el contexto, responda educadamente que está sintonizado para responder solo preguntas relacionadas con el contexto.

  Pregunta: {question}
  =========
  {context}
  =========
  Respuesta en Markdown:`,
);

export const makeChain = (
  vectorstore: PineconeStore,
  onTokenStream?: (token: string) => void,
) => {
  const questionGenerator = new LLMChain({
    llm: new OpenAIChat({ temperature: 0 }),
    prompt: CONDENSE_PROMPT,
  });
  const docChain = loadQAChain(
    new OpenAIChat({
      temperature: 0,
      modelName: 'gpt-3.5-turbo', //change this to older versions (e.g. gpt-3.5-turbo) if you don't have access to gpt-4
      streaming: Boolean(onTokenStream),
      callbackManager: onTokenStream
        ? CallbackManager.fromHandlers({
            async handleLLMNewToken(token) {
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
