import { storage } from '@/firebase'
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage'

export async function uploadFileToStorage(
  file: File,
  path: string,
  onProgress?: (percent: number) => void
): Promise<string> {
  const storageRef = ref(storage, path)
  const uploadTask = uploadBytesResumable(storageRef, file)

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        onProgress?.(progress)
      },
      (error) => {
        reject(error)
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref)
        resolve(downloadURL)
      }
    )
  })
}

export async function deleteFileFromStorage(fileUrl: string): Promise<void> {
  try {
    const fileRef = ref(storage, fileUrl)
    await deleteObject(fileRef)
  } catch (error) {
    console.error('Error deleting file from storage:', error)
  }
}

export async function getFileDownloadURL(storagePath: string): Promise<string> {
  try {
    const fileRef = ref(storage, storagePath)
    return await getDownloadURL(fileRef)
  } catch (error) {
    console.error('Error getting download URL:', error)
    throw error
  }
}
