
import { Global, css } from "@emotion/react"
import { Link } from "@swiftly/core"
import styled from "@emotion/styled"

const globalCss = css`
html, body, #root {
  height: 100%;
}
body {
  margin: 0;
  font-family: system-ui;
}
`

const Wrapper = styled.div`
display: flex;
flex-wrap: wrap;
height: 100%;
`

const SidebarWrapper = styled.div`
background-color: gray;
`

const SidebarLink = styled(Link)`
display: block;
font-weight: bold;
text-decoration: none;
font-size: 1.5rem;
padding: 1rem;
color: white;
&:hover {
  color: lightblue;
}
`

const Sidebar = () => {
  return (
    <SidebarWrapper>
      <SidebarLink to="/">Home</SidebarLink>
      <SidebarLink to="/about">About</SidebarLink>
    </SidebarWrapper>
  );
}

export interface LayoutProps {
  children: React.ReactNode;
  bare?: boolean;
}

export function Layout({ children, bare }: LayoutProps) {
  let element;
  if (bare) {
    element = children;
  } else {
    element = (
      <>
        <Sidebar />
        <main style={{ padding: '1rem' }}>{children}</main>
      </>
    );
  }
  return (
    <Wrapper>
      <Global styles={globalCss} />
      {element}
    </Wrapper>
  );
}

export default Layout;

