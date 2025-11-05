import { Layout, Typography } from "antd";
import PackingInput from "./components/PackingInput";
import Viewer from "./components/Viewer";
import StatusBar from "./components/StatusBar";
import "./App.css";

const { Header, Content, Sider, Footer } = Layout;
const { Link } = Typography;

function App() {

    return (
        <Layout className="app-container">
            <Header
                className="header"
                style={{ justifyContent: "space-between" }}
            >
                <h2 className="header-title">cellPACK Studio</h2>
                <Link
                    href="https://github.com/mesoscope/cellpack"
                    className="header-link"
                >
                    GitHub
                </Link>
            </Header>
            <Layout>
                <Sider width="35%" theme="light" className="sider">
                    <PackingInput />
                </Sider>
                <Content className="content-container">
                    <Viewer />
                </Content>
            </Layout>
            <Footer className="footer">
                <StatusBar />
            </Footer>
        </Layout>
    );
}

export default App;
