#!/bin/bash

# DynamoDB Table Creation Script for Threat Profiling Application
# This script creates all necessary DynamoDB tables with proper keys and indexes

echo "Creating DynamoDB tables for Threat Profiling Application..."

# 1. USERS TABLE
echo "Creating users table..."
aws dynamodb create-table \
    --table-name users \
    --attribute-definitions \
        AttributeName=email,AttributeType=S \
        AttributeName=role,AttributeType=S \
        AttributeName=status,AttributeType=S \
        AttributeName=partner_code,AttributeType=S \
    --key-schema \
        AttributeName=email,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --global-secondary-indexes \
        IndexName=role-index,KeySchema=[{AttributeName=role,KeyType=HASH}],Projection={ProjectionType=ALL} \
        IndexName=status-index,KeySchema=[{AttributeName=status,KeyType=HASH}],Projection={ProjectionType=ALL} \
        IndexName=partner-code-index,KeySchema=[{AttributeName=partner_code,KeyType=HASH}],Projection={ProjectionType=ALL} \
    --tags Key=Environment,Value=production Key=Application,Value=threat-profiling

# 2. APPS TABLE
echo "Creating apps table..."
aws dynamodb create-table \
    --table-name apps \
    --attribute-definitions \
        AttributeName=client_name,AttributeType=S \
        AttributeName=application_name,AttributeType=S \
    --key-schema \
        AttributeName=client_name,KeyType=HASH \
        AttributeName=application_name,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST \
    --tags Key=Environment,Value=production Key=Application,Value=threat-profiling

# 3. CLIENTS_DATA TABLE
echo "Creating clients_data table..."
aws dynamodb create-table \
    --table-name clients_data \
    --attribute-definitions \
        AttributeName=client_name,AttributeType=S \
        AttributeName=org_domain,AttributeType=S \
        AttributeName=origin_country,AttributeType=S \
        AttributeName=industry_sector,AttributeType=S \
    --key-schema \
        AttributeName=client_name,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --global-secondary-indexes \
        IndexName=org-domain-index,KeySchema=[{AttributeName=org_domain,KeyType=HASH}],Projection={ProjectionType=ALL} \
        IndexName=origin-country-index,KeySchema=[{AttributeName=origin_country,KeyType=HASH}],Projection={ProjectionType=ALL} \
        IndexName=industry-sector-index,KeySchema=[{AttributeName=industry_sector,KeyType=HASH}],Projection={ProjectionType=ALL} \
    --tags Key=Environment,Value=production Key=Application,Value=threat-profiling

# 4. CLIENTS_SUBS TABLE
echo "Creating clients_subs table..."
aws dynamodb create-table \
    --table-name clients_subs \
    --attribute-definitions \
        AttributeName=client_name,AttributeType=S \
        AttributeName=sub_level,AttributeType=S \
        AttributeName=payment_status,AttributeType=S \
        AttributeName=sub_type,AttributeType=S \
    --key-schema \
        AttributeName=client_name,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --global-secondary-indexes \
        IndexName=sub-level-index,KeySchema=[{AttributeName=sub_level,KeyType=HASH}],Projection={ProjectionType=ALL} \
        IndexName=payment-status-index,KeySchema=[{AttributeName=payment_status,KeyType=HASH}],Projection={ProjectionType=ALL} \
        IndexName=sub-type-index,KeySchema=[{AttributeName=sub_type,KeyType=HASH}],Projection={ProjectionType=ALL} \
    --tags Key=Environment,Value=production Key=Application,Value=threat-profiling

# 5. PAYMENTS TABLE
echo "Creating payments table..."
aws dynamodb create-table \
    --table-name payments \
    --attribute-definitions \
        AttributeName=payment_id,AttributeType=S \
        AttributeName=client_name,AttributeType=S \
        AttributeName=user_email,AttributeType=S \
        AttributeName=payment_status,AttributeType=S \
        AttributeName=payment_date,AttributeType=S \
        AttributeName=sub_level,AttributeType=S \
    --key-schema \
        AttributeName=payment_id,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --global-secondary-indexes \
        IndexName=client-name-index,KeySchema=[{AttributeName=client_name,KeyType=HASH}],Projection={ProjectionType=ALL} \
        IndexName=user-email-index,KeySchema=[{AttributeName=user_email,KeyType=HASH}],Projection={ProjectionType=ALL} \
        IndexName=payment-status-index,KeySchema=[{AttributeName=payment_status,KeyType=HASH}],Projection={ProjectionType=ALL} \
        IndexName=payment-date-index,KeySchema=[{AttributeName=payment_date,KeyType=HASH}],Projection={ProjectionType=ALL} \
        IndexName=sub-level-index,KeySchema=[{AttributeName=sub_level,KeyType=HASH}],Projection={ProjectionType=ALL} \
    --tags Key=Environment,Value=production Key=Application,Value=threat-profiling

# 6. PARTNERS_CODE TABLE
echo "Creating partners_code table..."
aws dynamodb create-table \
    --table-name partners_code \
    --attribute-definitions \
        AttributeName=partner_code,AttributeType=S \
        AttributeName=partner_email,AttributeType=S \
        AttributeName=code_status,AttributeType=S \
        AttributeName=expiry_date,AttributeType=S \
    --key-schema \
        AttributeName=partner_code,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --global-secondary-indexes \
        IndexName=partner-email-index,KeySchema=[{AttributeName=partner_email,KeyType=HASH}],Projection={ProjectionType=ALL} \
        IndexName=code-status-index,KeySchema=[{AttributeName=code_status,KeyType=HASH}],Projection={ProjectionType=ALL} \
        IndexName=expiry-date-index,KeySchema=[{AttributeName=expiry_date,KeyType=HASH}],Projection={ProjectionType=ALL} \
    --tags Key=Environment,Value=production Key=Application,Value=threat-profiling

# 7. PARTNERS TABLE
echo "Creating partners table..."
aws dynamodb create-table \
    --table-name partners \
    --attribute-definitions \
        AttributeName=partner_email,AttributeType=S \
        AttributeName=partner_name,AttributeType=S \
    --key-schema \
        AttributeName=partner_email,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --global-secondary-indexes \
        IndexName=partner-name-index,KeySchema=[{AttributeName=partner_name,KeyType=HASH}],Projection={ProjectionType=ALL} \
    --tags Key=Environment,Value=production Key=Application,Value=threat-profiling

# 8. PENDING_JOINS TABLE
echo "Creating pending_joins table..."
aws dynamodb create-table \
    --table-name pending_joins \
    --attribute-definitions \
        AttributeName=email,AttributeType=S \
        AttributeName=client_name,AttributeType=S \
        AttributeName=requested_at,AttributeType=S \
    --key-schema \
        AttributeName=email,KeyType=HASH \
        AttributeName=client_name,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST \
    --global-secondary-indexes \
        IndexName=client-name-index,KeySchema=[{AttributeName=client_name,KeyType=HASH}],Projection={ProjectionType=ALL} \
        IndexName=requested-at-index,KeySchema=[{AttributeName=requested_at,KeyType=HASH}],Projection={ProjectionType=ALL} \
    --tags Key=Environment,Value=production Key=Application,Value=threat-profiling

# 9. SUBSCRIPTION_TIERS TABLE
echo "Creating subscription_tiers table..."
aws dynamodb create-table \
    --table-name subscription_tiers \
    --attribute-definitions \
        AttributeName=sub_level,AttributeType=S \
        AttributeName=is_active,AttributeType=S \
    --key-schema \
        AttributeName=sub_level,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --global-secondary-indexes \
        IndexName=is-active-index,KeySchema=[{AttributeName=is_active,KeyType=HASH}],Projection={ProjectionType=ALL} \
    --tags Key=Environment,Value=production Key=Application,Value=threat-profiling

echo "Waiting for tables to be created..."

# Wait for all tables to be active
tables=("users" "apps" "clients_data" "clients_subs" "payments" "partners_code" "partners" "pending_joins" "subscription_tiers")

for table in "${tables[@]}"; do
    echo "Waiting for table $table to be active..."
    aws dynamodb wait table-exists --table-name $table
    echo "Table $table is now active!"
done

echo "All DynamoDB tables have been created successfully!"

# Optional: Insert default subscription tier data
echo "Inserting default subscription tiers..."

# L1 Tier
aws dynamodb put-item \
    --table-name subscription_tiers \
    --item '{
        "sub_level": {"S": "L1"},
        "name": {"S": "Entry Level"},
        "description": {"S": "Basic threat profiling for small organizations"},
        "is_active": {"S": "true"},
        "price_monthly": {"N": "49"},
        "price_onetime": {"N": "99"},
        "features": {
            "M": {
                "max_apps": {"N": "1"},
                "run_quota": {"N": "1"},
                "max_edits": {"N": "1"},
                "threat_detection": {"BOOL": false},
                "compliance_reports": {"BOOL": false},
                "compliance_frameworks": {"L": []},
                "api_access": {"BOOL": false},
                "custom_branding": {"BOOL": false},
                "priority_support": {"BOOL": false},
                "sso_integration": {"BOOL": false},
                "audit_logs": {"BOOL": false},
                "data_export": {"BOOL": true}
            }
        }
    }'

# L2 Tier
aws dynamodb put-item \
    --table-name subscription_tiers \
    --item '{
        "sub_level": {"S": "L2"},
        "name": {"S": "Intermediate"},
        "description": {"S": "Enhanced threat profiling with compliance reporting"},
        "is_active": {"S": "true"},
        "price_monthly": {"N": "99"},
        "price_onetime": {"N": "199"},
        "features": {
            "M": {
                "max_apps": {"N": "2"},
                "run_quota": {"N": "2"},
                "max_edits": {"N": "2"},
                "threat_detection": {"BOOL": true},
                "compliance_reports": {"BOOL": true},
                "compliance_frameworks": {"L": [{"S": "ISM"}, {"S": "E8"}]},
                "api_access": {"BOOL": false},
                "custom_branding": {"BOOL": false},
                "priority_support": {"BOOL": false},
                "sso_integration": {"BOOL": false},
                "audit_logs": {"BOOL": true},
                "data_export": {"BOOL": true}
            }
        }
    }'

# L3 Tier
aws dynamodb put-item \
    --table-name subscription_tiers \
    --item '{
        "sub_level": {"S": "L3"},
        "name": {"S": "Advanced"},
        "description": {"S": "Full threat profiling with detection queries and advanced features"},
        "is_active": {"S": "true"},
        "price_monthly": {"N": "199"},
        "price_onetime": {"N": "399"},
        "features": {
            "M": {
                "max_apps": {"N": "5"},
                "run_quota": {"N": "3"},
                "max_edits": {"N": "3"},
                "threat_detection": {"BOOL": true},
                "compliance_reports": {"BOOL": true},
                "compliance_frameworks": {"L": [{"S": "ISM"}, {"S": "E8"}]},
                "api_access": {"BOOL": true},
                "custom_branding": {"BOOL": true},
                "priority_support": {"BOOL": true},
                "sso_integration": {"BOOL": true},
                "audit_logs": {"BOOL": true},
                "data_export": {"BOOL": true}
            }
        }
    }'

# LE Tier
aws dynamodb put-item \
    --table-name subscription_tiers \
    --item '{
        "sub_level": {"S": "LE"},
        "name": {"S": "Large Enterprise"},
        "description": {"S": "Multi-organization controller with unlimited access"},
        "is_active": {"S": "true"},
        "price_monthly": {"N": "499"},
        "price_onetime": {"N": "999"},
        "features": {
            "M": {
                "max_apps": {"N": "-1"},
                "run_quota": {"N": "-1"},
                "max_edits": {"N": "-1"},
                "threat_detection": {"BOOL": true},
                "compliance_reports": {"BOOL": true},
                "compliance_frameworks": {"L": [{"S": "ISM"}, {"S": "E8"}]},
                "api_access": {"BOOL": true},
                "custom_branding": {"BOOL": true},
                "priority_support": {"BOOL": true},
                "sso_integration": {"BOOL": true},
                "audit_logs": {"BOOL": true},
                "data_export": {"BOOL": true}
            }
        }
    }'

echo "Default subscription tiers have been inserted!"
echo "DynamoDB setup is complete!"

# Display table information
echo ""
echo "Created tables summary:"
echo "======================="
for table in "${tables[@]}"; do
    echo "✅ $table"
done

echo ""
echo "Key Design Decisions:"
echo "===================="
echo "• users: Partition key = email (unique user identifier)"
echo "• apps: Partition key = client_name, Sort key = application_name (multiple apps per client)"
echo "• clients_data: Partition key = client_name (unique client identifier)"
echo "• clients_subs: Partition key = client_name (subscription info per client)"
echo "• payments: Partition key = payment_id (unique payment identifier)"
echo "• partners_code: Partition key = partner_code (unique code identifier)"
echo "• partners: Partition key = partner_email (unique partner identifier)"
echo "• pending_joins: Partition key = email, Sort key = client_name (multiple join requests)"
echo "• subscription_tiers: Partition key = sub_level (unique tier identifier)"
echo ""
echo "All tables use PAY_PER_REQUEST billing mode for cost optimization."
echo "Global Secondary Indexes have been created for common query patterns."
