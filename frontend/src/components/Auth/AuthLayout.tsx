import { Card, Title, Text } from "@mantine/core"

export default function AuthLayout({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div style={{ display: "flex", justifyContent: "center", marginTop: "100px" }}>
      <Card shadow="md" padding="lg" radius="md" w={400}>
        <Title order={2} mb="sm">{title}</Title>
        <Text size="sm" color="dimmed" mb="lg">
          Enter your details below
        </Text>
        {children}
      </Card>
    </div>
  )
}