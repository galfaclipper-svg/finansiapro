import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Printer } from 'lucide-react';

const ReportPlaceholder = ({ title }: { title: string }) => (
    <Card>
        <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>This is a placeholder for the {title} report.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">{title} data will be displayed here.</p>
            </div>
        </CardContent>
    </Card>
)

export default function ReportsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Financial Reports"
        description="Generate and view your business's financial statements."
      >
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export All (XLSX)
        </Button>
         <Button variant="outline">
          <Printer className="mr-2 h-4 w-4" />
          Print All (PDF)
        </Button>
      </PageHeader>
      
      <Tabs defaultValue="income-statement">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
            <TabsTrigger value="income-statement">Income Statement</TabsTrigger>
            <TabsTrigger value="balance-sheet">Balance Sheet</TabsTrigger>
            <TabsTrigger value="cash-flow">Cash Flow</TabsTrigger>
            <TabsTrigger value="general-journal">General Journal</TabsTrigger>
            <TabsTrigger value="general-ledger">General Ledger</TabsTrigger>
        </TabsList>
        <TabsContent value="income-statement">
            <ReportPlaceholder title="Income Statement" />
        </TabsContent>
        <TabsContent value="balance-sheet">
            <ReportPlaceholder title="Balance Sheet" />
        </TabsContent>
        <TabsContent value="cash-flow">
            <ReportPlaceholder title="Cash Flow Statement" />
        </TabsContent>
        <TabsContent value="general-journal">
            <ReportPlaceholder title="General Journal" />
        </TabsContent>
        <TabsContent value="general-ledger">
            <ReportPlaceholder title="General Ledger" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
