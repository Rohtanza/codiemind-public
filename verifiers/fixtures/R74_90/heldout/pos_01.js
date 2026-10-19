import firebase from "firebase/compat/app";
import "firebase/compat/storage";

export function uploadResume(uid, file) {
  const storageRef = firebase.storage().ref().child(`resumes/${uid}/${file.name}`);
  return storageRef.put(file).then((snap) => snap.ref.getDownloadURL());
}
