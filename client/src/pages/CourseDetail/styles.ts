export const courseDetailStyles = {
  pageContainer: {
    padding: '10px',
    maxWidth: 1440,
    margin: '0 auto'
  },
  pageContainerMobile: {
    padding: '5px',
    maxWidth: 1440,
    margin: '0 auto'
  },
  loadingWrap: {
    textAlign: 'center' as const,
    padding: '100px 0'
  },
  notFoundWrap: {
    textAlign: 'center' as const,
    padding: '100px 0'
  },
  layoutRow: {
    display: 'flex',
    gap: 26,
    flexDirection: 'row' as const
  },
  layoutColumnMobile: {
    display: 'flex',
    gap: 0,
    flexDirection: 'column' as const
  },
  sidebarPcWrap: {
    width: 390,
    flexShrink: 0
  },
  mainContentWrap: {
    flex: 1,
    minWidth: 0
  },
  drawerWidth: 320
};
