
export interface Route {
  render: () => React.ReactNode;
  path: string;
  createdAt?: Date;
}

