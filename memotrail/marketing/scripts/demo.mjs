// Runs only inside a new, ephemeral Playwright context at the dedicated local origin.
// Existing records cause a refusal: this fixture never clears or updates a journal.
export async function seedMarketingJournal(page) {
  return page.evaluate(async () => {
    if (location.origin !== 'http://127.0.0.1:4196') throw Error('Demo fixture refuses non-marketing origins.');
    const photos = ['lake-weekend','golden-hour','slow-mornings','wildflowers','mountain-air','italian-summer'];
    const blobs=await Promise.all(photos.map(async name=>{
      const response=await fetch(`/photos/${name}.jpg`);
      if(!response.ok)throw Error(`Missing bundled photo ${name}`);
      return response.blob();
    }));
    const request=indexedDB.open('memotrail');
    const db=await new Promise((ok,no)=>{request.onsuccess=()=>ok(request.result);request.onerror=()=>no(request.error)});
    if(db.version!==40)throw Error('Expected the existing Dexie v4 schema; no schema changes are allowed.');
    const stores=['memories','media','collections','timeCapsules','timeCapsuleMedia'];
    const read=db.transaction(stores,'readonly');
    const counts=await Promise.all(stores.map(name=>new Promise((ok,no)=>{const r=read.objectStore(name).count();r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})));
    if(counts.some(Boolean)){db.close();throw Error('Fixture refuses any context that already contains journal records.');}
    const now=Date.parse('2026-10-14T04:00:00Z');
    const memories=[
      ['cafe','Our favorite little café','2026-10-12',2,'everyday','peaceful','Two coffees, a window seat, and nowhere else to be. We stayed until the rain stopped.','The corner café'],
      ['sunset','Stay for the sunset','2026-10-10',1,'adventures','grateful','We took the long way home. The sky turned gold, and for a little while everything felt still.','The evening trail'],
      ['lake','A weekend by the lake','2026-10-07',0,'adventures','adventurous','Still water, mountain air, and slow conversations. A small escape we will always remember.','By the water'],
      ['anniversary','The day we took the long way','2025-10-14',4,'adventures','nostalgic','A year ago today: a pocket full of trail notes and a view that made us stop talking.','The mountain trail'],
      ['graduation','Graduation morning','2026-06-20',3,'milestones','grateful','Flowers on the desk, a proud phone call home, and the beginning of a brand-new chapter.','Home'],
      ['birthday','A birthday full of little joys','2026-06-09',3,'milestones','happy','Handwritten cards, a favorite cake, and the people who make ordinary days feel special.','Around the table'],
      ['project','Our first college project','2026-06-02',2,'milestones','happy','Late-night notes became something we could finally share. We celebrated over coffee.','The campus café'],
      ['summer','A summer worth keeping','2025-08-17',5,'adventures','adventurous','Colorful streets, an open notebook, and the kind of afternoon that asks you to slow down.','A little seaside town'],
      ['family','Sunday with the family','2025-06-08',2,'everyday','grateful','A slow breakfast and stories we had heard before. Somehow they still made everyone laugh.','Home'],
    ];
    const tx=db.transaction([...stores,'settings'],'readwrite');
    for(const [id,title,memoryDate,photo,collection,mood,description,locationName] of memories){
      const blob=blobs[photo];
      tx.objectStore('memories').add({id:`marketing-${id}`,title,memoryDate,description,locationName,mood,favorite:['cafe','lake','anniversary','graduation'].includes(id),collectionId:`marketing-${collection}`,createdAt:Date.parse(`${memoryDate}T04:00:00Z`),updatedAt:now});
      tx.objectStore('media').add({id:`marketing-photo-${id}`,memoryId:`marketing-${id}`,type:'image',blob,mimeType:blob.type,size:blob.size,order:0,createdAt:now});
    }
    const second=blobs[4];tx.objectStore('media').add({id:'marketing-lake-second',memoryId:'marketing-lake',type:'image',blob:second,mimeType:second.type,size:second.size,order:1,createdAt:now});
    for(const [id,name,cover,description] of [['adventures','Favorite Adventures','lake','The places that made us pause.'],['everyday','The Everyday Good','cafe','Coffee, conversations, and ordinary magic.'],['milestones','Little Milestones','graduation','The chapters that changed everything.']])tx.objectStore('collections').add({id:`marketing-${id}`,name,description,coverMediaId:`marketing-photo-${cover}`,createdAt:now,updatedAt:now});
    for(const [id,title,unlockAt] of [['future','For the person I am becoming','2027-10-14T04:00:00Z'],['ready','A little letter from last year','2026-10-14T03:00:00Z'],['summer','Remember this summer','2028-06-01T04:00:00Z']])tx.objectStore('timeCapsules').add({id:`marketing-${id}`,title,message:'Dear future me, keep making room for the little things. Remember the lake, the slow mornings, and the people who made this chapter beautiful.',recipientName:'Future me',mood:'grateful',createdAt:'2025-10-14T04:00:00Z',updatedAt:'2025-10-14T04:00:00Z',unlockAt,status:'sealed'});
    tx.objectStore('timeCapsuleMedia').add({id:'marketing-capsule-photo',capsuleId:'marketing-future',blob:blobs[0],mimeType:blobs[0].type,order:0,createdAt:'2025-10-14T04:00:00Z'});
    for(const [key,value] of [
      ['memotrail-preferences',JSON.stringify({state:{name:'memory keeper',theme:'dark',sampleMode:false,reduceMotion:true},version:1})],
      ['onboarding',JSON.stringify({completed:true,step:4})],
      ['backup-status',JSON.stringify({reminders:false})],
    ])tx.objectStore('settings').put({key,value});
    await new Promise((ok,no)=>{tx.oncomplete=ok;tx.onabort=()=>no(tx.error);tx.onerror=()=>no(tx.error)});db.close();
    return {memories:memories.length,collections:3,capsules:3,photoSources:photos};
  });
}
