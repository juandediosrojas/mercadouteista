import {

doc,

collection,

query,

where,

getDoc,

getDocs,

setDoc,

updateDoc,

serverTimestamp

} from "firebase/firestore";

import { db } from "./config";

export async function createSeller(uid:string,data:any){

    await setDoc(doc(db,"sellers",uid),{

        uid,

        businessName:data.businessName,

        description:data.description,

        category:data.category,

        avatar:"",

        rating:5,

        totalSales:0,

        createdAt:serverTimestamp()

    });

    await updateDoc(doc(db,"users",uid),{

        seller:true

    });

}

export async function getSeller(uid:string){

    const snap=await getDoc(doc(db,"sellers",uid));

    if(!snap.exists()) return null;

    return snap.data();

}


export async function getSellerByOwner(uid:string){

    const q = query(collection(db, "sellers"), where("ownerId", "==", uid));
    const snap = await getDocs(q);

    if(snap.empty) return null;

    const docSnap = snap.docs[0];
    return { id: docSnap.id, ...(docSnap.data() as any) };
}
