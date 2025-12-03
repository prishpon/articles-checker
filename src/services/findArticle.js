import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";

export async function findArticle(word) {
  const q = query(collection(db, "words"), where("word", "==", word.toLowerCase()));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data().article;
}