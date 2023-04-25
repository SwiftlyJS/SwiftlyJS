
export interface RouteSpec {
  render: () => React.ReactNode;
  path: string;
  createdAt?: Date;
  modifiedAt?: Date;
}

