import { spfi, SPFx } from "@pnp/sp";
import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/items";
import "@pnp/sp/folders";
import "@pnp/sp/files";
import { WebPartContext } from "@microsoft/sp-webpart-base";

// SPFI bağlamını oluşturmak için kullanılan getSP fonksiyonu
export const getSP = (context: WebPartContext) => {
  return spfi().using(SPFx(context));
};

// Belirtilen klasör ve dosyaları almak için bir yardımcı fonksiyon
export const getFilesAndFolders = async (context: WebPartContext, libraryName: string, folderPath: string) => {
  try {
    const sp = getSP(context);

    // Belirtilen klasörün dosya ve alt klasörlerini alın
    const folder = sp.web.getFolderByServerRelativePath(`${libraryName}/${folderPath}`);

    // Dosya bilgilerini genişletmek için select ve expand kullanın
    const files = await folder.files.select("Id", "Name", "TimeCreated", "Author/Title", "ListItemAllFields/Dil").expand("Author", "ListItemAllFields")();
    const folders = await folder.folders.select("Name", "TimeCreated", "Author/Title").expand("Author")();

    return { files, folders };
  } catch (error) {
    console.error("Hata:", error);
    throw error;
  }
};