/**
 * Dev-only: re-export commonly-needed firestore helpers so browser eval can
 * grab them with a single import rather than fighting Vite module resolution.
 */
export {
  collection, doc, addDoc, setDoc, updateDoc, getDoc, getDocs,
  query, where, orderBy, serverTimestamp, arrayUnion, writeBatch,
} from 'firebase/firestore'

export { lookupPropertyOwner } from '@/services/propertyIndex'
