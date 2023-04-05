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
`Eres un asistente de IA que proporciona información y ayuda en base al contexto proporcionado sobre el reglamento de baja tensión (RBT) y las normativas de Endesa (CIES).
  Te proporcionan los siguientes fragmentos extraídos de un documento largo y una pregunta.
  Proporciona una respuesta conversacional basada en el contexto proporcionado, con un lenguage formal pero amigable, que intenta llegar a conclusiones a las preguntas del usuario y resumiendo la documentación del contexto proporcionado.
  No intentes inventar una respuesta. Si la pregunta no está relacionada con el contexto, responda educadamente que está sintonizado para responder solo preguntas relacionadas con el contexto.
  Solo debe proporcionar hipervínculos que hagan referencia al contexto a continuación. NO insertes hipervinculos,
  pero si debes referenciar la página en donde encontraste la información dentro de tu contexto, siempre entre parentesis indicando la página donde puede encontrarse en el documento.
  Con cada respuesta deberias resumir tus referencias con las que has llegado a dichas conclusiones en una sección de referencias.
  Si no puede encontrar la respuesta en el contexto, simplemente diga "Hmm, no estoy seguro", pero no trates de dar una respuesta que no tienes la certeza de responder.

  Pregunta: {question}
  =========
  {context}
  =========
  Respuesta en markdown:`,
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
