import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const routeSchema = readFileSync("supabase/migrations/20261001347000_field_service_routes_partner_access.sql", "utf8");
const partnerExecution = readFileSync("supabase/migrations/20261001348000_partner_access_execution.sql", "utf8");
const dispatchSync = readFileSync("supabase/migrations/20261001349000_service_order_ticket_dispatch_sync.sql", "utf8");
const routeCommands = readFileSync("supabase/migrations/20261001350000_field_service_route_commands.sql", "utf8");
const orderContext = readFileSync("supabase/migrations/20261001351000_service_order_ticket_context.sql", "utf8");
const routeResequence = readFileSync("supabase/migrations/20261001352000_field_route_resequence.sql", "utf8");
const routeRemoval = readFileSync("supabase/migrations/20261001353000_field_route_stop_removal.sql", "utf8");
const fieldEventSync = readFileSync("supabase/migrations/20261001354000_field_event_service_order_sync.sql", "utf8");
const completionSync = readFileSync("supabase/migrations/20261001355000_completion_service_order_sync.sql", "utf8");

describe("field service base", () => {
  it("models routes, ordered stops and temporary partner access", () => {
    expect(routeSchema).toContain("create table public.field_service_routes");
    expect(routeSchema).toContain("create table public.field_service_route_stops");
    expect(routeSchema).toContain("unique(route_id,sequence_number)");
    expect(routeSchema).toContain("create table public.service_order_partner_accesses");
    expect(routeSchema).toContain("token_hash text not null unique");
    expect(routeSchema).toContain("token_hash,access_code_hash,expires_at,created_by");
  });

  it("limits external execution to hashed token and code validation", () => {
    expect(partnerExecution).toContain("create or replace function public.assert_partner_access");
    expect(partnerExecution).toContain("access_record.validation_count >= 5");
    expect(partnerExecution).toContain("if access_record.access_code_hash <>");
    expect(partnerExecution).toContain("set validation_count=validation_count+1");
    expect(partnerExecution).toContain("set last_validated_at=clock_timestamp()");
    expect(partnerExecution).toContain("target_event not in('CHECK_IN','CHECK_OUT','SUBMIT')");
    expect(partnerExecution).toContain("grant execute on function public.get_partner_service_order_context");
    expect(partnerExecution).toContain(" to anon");
  });

  it("synchronizes an authorized service-order dispatch to the technician agenda", () => {
    expect(dispatchSync).toContain("update public.tickets set assigned_technician_id=target_technician_id");
    expect(dispatchSync).toContain("operational_status='ASSIGNED'");
    expect(dispatchSync).toContain("insert into public.ticket_status_history");
    expect(dispatchSync).toContain("SERVICE_ORDER_DISPATCHED");
  });

  it("only allows compatible dispatched orders on a technician route", () => {
    expect(routeCommands).toContain("create or replace function public.create_field_service_route");
    expect(routeCommands).toContain("create or replace function public.add_service_order_to_field_route");
    expect(routeCommands).toContain("FIELD_ROUTE_ORDER_MISMATCH");
    expect(routeCommands).toContain("order_record.technician_id<>route_record.technician_id");
    expect(routeCommands).toContain("coalesce(max(sequence_number),0)::smallint+1");
  });

  it("inherits the ticket contract and location when creating an order", () => {
    expect(orderContext).toContain("effective_contract_id:=coalesce(target_contract_id,ticket_record.contract_id)");
    expect(orderContext).toContain("effective_location_id:=coalesce(target_location_id,ticket_record.location_id)");
    expect(orderContext).toContain("SERVICE_ORDER_LOCATION_REQUIRED");
    expect(orderContext).toContain("location_id");
  });

  it("protects route resequencing from duplicate or foreign stops", () => {
    expect(routeResequence).toContain("deferrable initially immediate");
    expect(routeResequence).toContain("create or replace function public.resequence_field_service_route");
    expect(routeResequence).toContain("FIELD_ROUTE_INVALID_SEQUENCE");
    expect(routeResequence).toContain("FIELD_ROUTE_STOP_MISMATCH");
    expect(routeResequence).toContain("FIELD_ROUTE_RESEQUENCED");
  });

  it("does not remove a stop after travel or check-in has begun", () => {
    expect(routeRemoval).toContain("create or replace function public.remove_service_order_from_field_route");
    expect(routeRemoval).toContain("stop_record.travel_started_at is not null");
    expect(routeRemoval).toContain("stop_record.checked_in_at is not null");
    expect(routeRemoval).toContain("FIELD_ROUTE_STOP_REMOVED");
  });

  it("keeps ticket, order and route-stop execution states synchronized", () => {
    expect(fieldEventSync).toContain("update public.tickets set operational_status = next_status");
    expect(fieldEventSync).toContain("update public.service_orders set status=order_status");
    expect(fieldEventSync).toContain("update public.field_service_route_stops set travel_started_at");
    expect(fieldEventSync).toContain("TICKET_FIELD_EVENT_RECORDED");
  });

  it("checks out and completes the field order on technical resolution", () => {
    expect(completionSync).toContain("after insert on public.ticket_completions");
    expect(completionSync).toContain("status = 'COMPLETED'");
    expect(completionSync).toContain("checked_out_at = checkout_time");
    expect(completionSync).toContain("update public.field_service_route_stops");
    expect(completionSync).toContain("'CHECK_OUT'");
    expect(completionSync).toContain("'COMPLETED'");
  });
});
