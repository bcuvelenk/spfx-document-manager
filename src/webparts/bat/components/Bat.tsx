import * as React from "react";
import styles from "./Bat.module.scss"
import { IBatProps } from "./IBatProps";
import "@fortawesome/fontawesome-free/css/all.min.css";
import { SPHttpClient, SPHttpClientResponse } from "@microsoft/sp-http";
import AdminPanel from "./AdminPanel"; // AdminPanel bileşenini içe aktar
import DepartmentManager from "./DepartmentManager"; // DepartmentManager bileşenini içe aktar
import logo from "../assets/logo.png";
import searchIcon from "../assets/SearchIcon.svg";
import icon from "../assets/blueFolderIcon.svg"
import spinner from "../assets/spinner.svg"
import fileIcon from "../assets/FileIcon.svg"
import home from "../assets/Home.svg"
import { getUserRole } from "./userHelpers";
import { searchDocuments } from "./pnpSetup";
import DepartmentDetail from "./DepartmentDetails";

interface SearchResult {
  Title: string;
  Path: string;
  FileType: string;
  Author: string;
  Created: string;
  Dil: string;
}


export interface Folder {
  Name: string;
  ServerRelativeUrl: string;
}

interface IBatState {
  isAdmin: boolean;
  isAdminPanelVisible: boolean;
  isDepartmentManagerVisible: boolean;
  searchQuery: string;
  searchResults: SearchResult[];
  folders: Folder[];
  selectedDepartment: string;
  isSearching: boolean;
  userRole: string; // Kullanıcı rolünü tutacak state
  activePage: string;
  selectedFolder: string;
}

export default class Bat extends React.Component<IBatProps, IBatState> {
  constructor(props: IBatProps) {
    super(props);
    this.state = {
      isAdmin: false,
      isAdminPanelVisible: false,
      isDepartmentManagerVisible: false,
      searchQuery: "",
      searchResults: [],
      folders: [],
      selectedDepartment: "", // Başlangıçta seçilen departman
      isSearching: false,
      userRole: '', // Başlangıçta kullanıcı rolü boş
      activePage: "",
      selectedFolder: "",
    };
  }


  private getCurrentUserEmail = async (): Promise<string> => {
    const { siteUrl, spHttpClient } = this.props;
    const response = await spHttpClient.get(
      `${siteUrl}/_api/web/currentuser?$select=Email`,
      SPHttpClient.configurations.v1
    );
    const data = await response.json();
    return data.Email;
  };
  
  private fetchUserRole = async (): Promise<void> => {
    try {
      const { siteUrl } = this.props;
      const userEmail = await this.getCurrentUserEmail(); // Kullanıcının e-posta adresini alıyoruz
      const role = await getUserRole(siteUrl, userEmail); // getUserRole fonksiyonunu çağırıyoruz
      if (role === "Admin") {
        this.setState({ isAdmin: true }); // Eğer admin ise, state güncelleniyor
      }
      this.setState({ userRole: role ?? 'Kullanıcı' }); // Kullanıcı rolünü state'e kaydediyoruz
    } catch (error) {
      console.error("Rol alınırken hata oluştu:", error);
    }
  };
  
  private toggleAdminPanel = (): void => {
    this.setState((prevState) => {
      const newState = {
        isAdminPanelVisible: !prevState.isAdminPanelVisible,
        isDepartmentManagerVisible: false,
      };
      console.log("Admin Panel Toggled:", newState.isAdminPanelVisible); // Kontrol etmek için
      return newState;
    });
  };

  private toggleDepartmentManager = (): void => {
    this.setState((prevState) => ({
      isDepartmentManagerVisible: !prevState.isDepartmentManagerVisible,
      isAdminPanelVisible: false, // Doküman Manager açıldığında Admin Panel kapanır
    }));
  };

  private toggleHome = (): void => {
    this.setState((prevState) => ({
      activePage: "",
      isDepartmentManagerVisible: false,
      isAdminPanelVisible: false, 
      
    }));
  };

  private handleSearchChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ): void => {
    this.setState({ searchQuery: event.target.value });
  };

  
  private handleSearch = async (): Promise<void> => {
    const { searchQuery } = this.state;
  
    if (!searchQuery) {
      alert("Lütfen bir arama terimi giriniz.");
      return;
    }
  
    this.setState({ isSearching: true });
  
    try {
      const results: SearchResult[] = await searchDocuments(this.props.context, searchQuery);
      console.log("PnP search results:", results);
  
      this.setState({ searchResults: results, isSearching: false });
    } catch (error) {
      console.error("Arama işlemi başarısız oldu:", error);
      alert("Arama işlemi başarısız oldu.");
      this.setState({ isSearching: false });
    }
  };

  private fetchFolders = async (): Promise<void> => {
    const { siteUrl, spHttpClient } = this.props;
  
    try {
      const endpoint = `${siteUrl}/_api/web/GetFolderByServerRelativeUrl('BAT')/Folders`;
      const response: SPHttpClientResponse = await spHttpClient.get(endpoint, SPHttpClient.configurations.v1);
  
      if (response.ok) {
        const data = await response.json();
        const folders: Folder[] = data.value
          .filter((folder: any) => folder.Name !== "Forms") // Forms adlı klasörü hariç tut
          .map((folder: any) => ({
            Name: folder.Name,
            ServerRelativeUrl: folder.ServerRelativeUrl,
          }));
  
        this.setState({ folders });
      } else {
        alert("Klasörler yüklenirken bir hata oluştu.");
      }
    } catch (error) {
      alert("Klasör bilgileri alınamadı.");
      console.error(error);
    }
  };
  
  private goDetailPage = (
    event: React.MouseEvent<HTMLButtonElement>,
    param: string
  ): void => {
    this.setState({ activePage: "Detail" });
    this.setState({ selectedFolder: param });
  };

  componentDidMount(): void {
    this.fetchFolders();
    this.fetchUserRole();
  }

  public render(): React.ReactElement<IBatProps> {
    console.log("Current User Role:", this.state.userRole); // Rolü burada kontrol edin
    const {
      isAdminPanelVisible= this.state,
      isDepartmentManagerVisible,
      searchQuery,
      searchResults,
      isSearching,
      folders,
      activePage,
      selectedFolder,
    } = this.state;

    return (
      <> 
      {activePage === "Detail" ? (
          <DepartmentDetail
            folderName={selectedFolder}
            spHttpClient={this.props.spHttpClient}
            siteUrl={this.props.siteUrl}
            context={this.props.context}
            toggleHome={this.toggleHome}
          />
      ) : (
      <div className={styles.box}>
        {/* Header Section */}
        <nav className={styles.nav}>
        <img className={styles.navlogo} src={logo} alt="BAT Logosu" />
        {
          !(isAdminPanelVisible || isDepartmentManagerVisible) ? <div className={styles.navsearch}>
          <input
            value={searchQuery}
            onChange={this.handleSearchChange}
            placeholder="Search..."
            className={styles.searchInput}
          />{/*<button
            onClick={this.handleSearch}
            className={styles.searchButton}
            disabled={isSearching}
            >
            Ara
          </button>*/}
          <img onClick={this.handleSearch} className={styles.navsearchicon} src={searchIcon} alt="Search Icon" />
          </div>:""
        }
            {/* Hide Admin Panel button if user is not admin */}
           <div style={{display:"flex"}}>
           {this.state.userRole === "Admin" && !isAdminPanelVisible ? (
            <button
                onClick={this.toggleAdminPanel}
                className={styles.buttons}
                >
                Admin Paneli
              </button>
          ):""}
            {
              this.state.userRole === "Admin" && !isDepartmentManagerVisible ?<button
              className={styles.buttons}
              onClick={this.toggleDepartmentManager}
            >
               Döküman Panel
            </button>:""
            }
            {
              isAdminPanelVisible || isDepartmentManagerVisible ? <button onClick={this.toggleHome}>
              <img src={home} style={{width:"20px"}} alt="" />
            </button>:"" 
            }
           </div>
       
        </nav>
         {/* Admin Paneli */}
         {isAdminPanelVisible && AdminPanel}
        {/* Content Section */}
        {!isAdminPanelVisible && !isDepartmentManagerVisible ? (
  <div>

    <div>
     
      {
        !searchQuery ? <div className={styles.cardArea}>
        {folders.length > 0 ? (
          folders.map((folder,index) => (
            <button
            style={{ backgroundColor: "white", border:"none" }}
            onClick={(e) => this.goDetailPage(e, folder.Name)}
          >
            <div key={index} className={styles.cardBox}>
                              <div className={styles.cardicon}>
                                <img
                                  style={{ width: "50%" }}
                                  src={icon}
                                  alt="folder-icon"
                                />
                              </div>
                              <div className={styles.cardcontent}>
                                {folder.Name}
                              </div>
                            </div>
                          </button>
                        ))
                      ) : (
                        <p>No folders found.</p>
        )}
  
      </div>: ""
      }
    </div>
    {
      searchQuery ? <div className={styles.searchResults}>
      <div style={{textAlign:"center"}}>
        <h3>Arama Sonuçları</h3>
      </div>
      {isSearching ? (
        <div style={{width:"100%",display:"flex",justifyContent:"center",alignItems:"center",height:"300px"}}>
           <img src={spinner} alt="" />
        </div>
      ) : searchResults.length > 0 ? (
        <div style={{maxHeight: "500px",overflowY: "auto"}}>
        <table className={styles.table}>
          <thead>
            <tr className={styles.tableTitles}>
              <th>Dosya</th>
              <th>Oluşturan</th>
              <th>Tarih</th>
              <th>Dosya Tipi</th>
              <th>Dil</th>
              <th></th>
            </tr>
          </thead>
            {searchResults.map((item, index) => (
              <tr key={index} className={styles.tableItems}>
                <td>{item.Title}</td> 
                <td>{item.Author}</td> 
                <td>{item.Created}</td> 
                <td>{item.FileType}</td> 
                <td>{item.Dil}</td> 
                <td>
                  <a href={item.Path} target="_blank">
                    <button>
                      <img style={{width:"35px"}} src={fileIcon} alt="" />
                    </button>
                  </a>
                </td>
              </tr>
            ))}
        </table>
      </div>
      ) : (
        <p>Sonuç bulunamadı. Lütfen arama ikonuna tıklayınız.</p>
      )}
    </div>:""
    }
  </div>
        ) : isAdminPanelVisible ? (
          <AdminPanel
          context={this.props.context}
          />
        ) : isDepartmentManagerVisible ? (
          <DepartmentManager
            siteUrl={this.props.siteUrl}
            spHttpClient={this.props.spHttpClient}
          />
        ) : null}
      </div>
      )}
      </>
    );
  }
}