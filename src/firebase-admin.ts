import admin, { ServiceAccount } from "firebase-admin";

const strip = (s: string) => s.replace(/^["']+|["',]+$/g, '').trim();

const getAdmin = () => {
  if (admin.apps.length) return admin.apps[0] as admin.app.App;

  const firebaseConfig: ServiceAccount = {
    projectId: strip(process.env.FIREB_PROJECT_ID!),
    privateKey: strip(process.env.FIREB_PRIVATE_KEY!.replace(/\\n/g, '\n')),
    clientEmail: strip(process.env.FIREB_CLIENT_EMAIL!),
  };

  admin.initializeApp({
    credential: admin.credential.cert(firebaseConfig),
    //storageBucket: strip(process.env.FIREB_STORAGE_BUCKET!),
  });

  return admin.apps[0] as admin.app.App;
}

export default getAdmin;
