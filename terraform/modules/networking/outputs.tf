output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "vpc_cidr_block" {
  description = "CIDR block of the VPC"
  value       = aws_vpc.main.cidr_block
}

output "internet_gateway_id" {
  description = "ID of the Internet Gateway"
  value       = aws_internet_gateway.main.id
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = aws_subnet.private[*].id
}

output "public_subnet_cidrs" {
  description = "CIDR blocks of the public subnets"
  value       = aws_subnet.public[*].cidr_block
}

output "private_subnet_cidrs" {
  description = "CIDR blocks of the private subnets"
  value       = aws_subnet.private[*].cidr_block
}

output "nat_gateway_ids" {
  description = "IDs of the NAT Gateways"
  value       = aws_nat_gateway.main[*].id
}

output "nat_gateway_ips" {
  description = "Elastic IP addresses of the NAT Gateways"
  value       = aws_eip.nat[*].public_ip
}

output "public_route_table_id" {
  description = "ID of the public route table"
  value       = aws_route_table.public.id
}

output "private_route_table_ids" {
  description = "IDs of the private route tables"
  value       = aws_route_table.private[*].id
}

# Convenience outputs for ECS and other services
output "public_subnet_1_id" {
  description = "ID of the first public subnet"
  value       = length(aws_subnet.public) > 0 ? aws_subnet.public[0].id : null
}

output "public_subnet_2_id" {
  description = "ID of the second public subnet"
  value       = length(aws_subnet.public) > 1 ? aws_subnet.public[1].id : null
}

output "private_subnet_1_id" {
  description = "ID of the first private subnet"
  value       = length(aws_subnet.private) > 0 ? aws_subnet.private[0].id : null
}

output "private_subnet_2_id" {
  description = "ID of the second private subnet"
  value       = length(aws_subnet.private) > 1 ? aws_subnet.private[1].id : null
}