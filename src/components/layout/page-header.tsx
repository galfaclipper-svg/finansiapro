import React from 'react';
import Balancer from 'react-wrap-balancer';

type PageHeaderProps = {
  title: string;
  description?: string;
  children?: React.ReactNode;
};

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
      <div className="grid gap-1">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight font-headline">
          {title}
        </h1>
        {description && (
          <p className="text-muted-foreground">
            <Balancer>{description}</Balancer>
          </p>
        )}
      </div>
      {children && <div className="w-full md:w-auto overflow-x-auto pb-2 md:pb-0">{children}</div>}
    </div>
  );
}
