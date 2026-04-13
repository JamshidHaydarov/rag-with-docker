import os
from pathlib import Path
from dotenv import load_dotenv
from langchain.chat_models import init_chat_model
from langchain_core.documents import Document
from langchain_core.vectorstores import InMemoryVectorStore
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pypdf import PdfReader

load_dotenv()


# Chat modelini yaratish
model = init_chat_model("google_genai:gemini-2.5-flash-lite",
                         api_key=os.getenv("GEMINI_API_KEY")
)


# Embedding modelini yaratish
embeddings = GoogleGenerativeAIEmbeddings(
    model="models/gemini-embedding-001"
)


# Faylni oqish va Document formatiga otkazish
def load_text_file(file_path: str) -> list[Document]:
    path = Path(file_path)
    reader = PdfReader(str(path))

    text = ""

    for page in reader.pages:
        text += page.extract_text() or ""

    return [
        Document(
            page_content=text,
            metadata={"source": path.name}
        )
    ]


# CHunklarga bolish
def split_documents(documents: list[Document]) -> list[Document]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=150
    )
    return splitter.split_documents(documents)


# Vector store yaratish va embeddinglarni saqlash
def build_vector_store(chunks: list[Document]) -> InMemoryVectorStore:
    vector_store = InMemoryVectorStore(embeddings)
    vector_store.add_documents(chunks)
    return vector_store


# Ohshash chunklarni qidirish
def retrieve_context(vector_store: InMemoryVectorStore, query: str, k: int = 3) -> list[Document]:
    return vector_store.similarity_search(query, k=k)


# Topilgan chunklar asosida javob berish
def answer_question(vector_store: InMemoryVectorStore, query: str) -> str:
    docs = retrieve_context(vector_store, query, k=3)

    context = "\n\n".join(
        f"Source: {doc.metadata.get('source', 'unknown')}\n{doc.page_content}"
        for doc in docs
    )

    prompt = f"""
                Sen faqat quyidagi kontekst asosida javob berasan.
                Agar kontekstda javob bo‘lmasa, shunday deb yoz: "Yuklangan fayl asosida bunday malumotni bilmayman".

                Kontekst:
                {context}

                Savol:
                {query}
            """

    response = model.invoke(prompt)
    return response.content


async def main(doc: str, question: str):
    docs = load_text_file(doc)
    chunks = split_documents(docs)
    vector_store = build_vector_store(chunks)
    answer = answer_question(vector_store, question)
    return answer

if __name__ == "__main__":
    main()