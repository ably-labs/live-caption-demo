
export type Sharable = { title: string, text: string, url: string };

export function enableSharing() {  

    const shareButton = document.getElementById("share") as HTMLButtonElement;

    if (!isNativeShareSupported()) {
        shareButton.innerText = "Copy share link";
    }

    shareButton.addEventListener("click", async () => {
        await share({ 
            title: 'Live Caption View', 
            text: 'Check out my live captions!', 
            url: `${window.location.href}view`
        });  
    });
}

function isNativeShareSupported() {
    if (!navigator.share) {
        return false; 
    }
    return true;
}

async function share(shareContent: Sharable) {
    if (!navigator.share) {
    
        if(navigator.clipboard) {
          navigator.clipboard.writeText(shareContent.url);
          return;
        }
    
        console.log("No Sharing available on platform");
        return;
      }
      
      try{
        await navigator.share(shareContent);
      } catch(ex) {
        console.log("Sharing failed", ex);
      }
}