# Design Principles: Microservices with Kafka

## Overview

This document outlines design principles for building event-driven microservices using Apache Kafka in a NestJS environment.

## Core Principles

### 1. Service Autonomy

Each microservice should be independently deployable and operate autonomously.

#### Characteristics
- **Independent Database**: Each service owns its data
- **Isolated Deployment**: Services can be deployed without affecting others
- **Technology Freedom**: Services can use different tech stacks if needed
- **Bounded Context**: Clear domain boundaries (DDD)

#### Implementation
```typescript
// ❌ Bad: Shared database across services
// Service A and Service B both accessing same tables

// ✅ Good: Each service has its own database
// User Service -> users_db
// Order Service -> orders_db
// Payment Service -> payments_db
```

### 2. Event-First Design

Design systems around events that represent business facts.

#### Event Characteristics
- **Immutable**: Events cannot be changed after publishing
- **Past Tense**: Events describe what happened (UserCreated, not CreateUser)
- **Self-Contained**: Include all necessary data
- **Versioned**: Support schema evolution

#### Example
```typescript
// ✅ Good event design
export interface OrderCompletedEvent extends BaseEvent {
  eventId: string;        // Unique identifier
  timestamp: string;      // When it occurred
  version: '1.0';         // Schema version
  orderId: string;
  userId: string;
  items: OrderItem[];
  totalAmount: number;
  paymentMethod: string;
  shippingAddress: Address;
}

// Event represents a business fact that occurred
await kafkaProducer.publishEvent('bobo.orders.completed', event);
```

### 3. Eventual Consistency

Accept that data will be eventually consistent across services.

#### Implications
- **No Distributed Transactions**: Avoid 2PC/XA transactions
- **Compensation Logic**: Implement sagas for business transactions
- **Idempotency**: Handle duplicate events gracefully
- **Monitoring**: Track lag and processing delays

#### Saga Pattern Example
```typescript
// Order Saga: Coordinating across services
class OrderSaga {
  async execute(orderData: CreateOrderData) {
    try {
      // Step 1: Create order
      const order = await this.createOrder(orderData);
      
      // Step 2: Reserve inventory
      await this.publishEvent('bobo.inventory.reserve', {
        orderId: order.id,
        items: order.items,
      });
      
      // Step 3: Process payment
      await this.publishEvent('bobo.payment.process', {
        orderId: order.id,
        amount: order.totalAmount,
      });
      
    } catch (error) {
      // Compensating actions
      await this.publishEvent('bobo.orders.cancelled', {
        orderId: order.id,
        reason: 'Payment failed',
      });
    }
  }
}
```

### 4. Service Communication Patterns

Choose the right communication pattern for each use case.

#### Async Events (Kafka)
**Use When:**
- Broadcasting state changes
- Decoupling services
- High throughput required
- Order matters (within partition)

**Example:**
```typescript
// User service publishes event
await kafka.publish('bobo.users.created', userCreatedEvent);

// Multiple services can consume
// - Email service: Send welcome email
// - Analytics service: Track user signup
// - Notification service: Create user inbox
```

#### Sync REST (HTTP)
**Use When:**
- Need immediate response
- Client-driven queries
- Simple CRUD operations
- Request-response pattern

**Example:**
```typescript
// Frontend requests user details
GET /api/users/{userId}
→ Returns user data immediately
```

#### Hybrid Approach
```typescript
// API endpoint for synchronous response
@Post('/orders')
async createOrder(@Body() dto: CreateOrderDto) {
  // 1. Create order synchronously
  const order = await this.ordersService.create(dto);
  
  // 2. Publish event for async processing
  await this.kafka.publish('bobo.orders.created', {
    orderId: order.id,
    ...orderData,
  });
  
  // 3. Return immediate response
  return { orderId: order.id, status: 'processing' };
}
```

### 5. Schema Evolution

Support backward and forward compatibility in event schemas.

#### Versioning Strategy

**Option 1: Version in Event**
```typescript
export interface UserUpdatedEvent_V1 extends BaseEvent {
  version: '1.0';
  userId: string;
  email: string;
  name: string;
}

export interface UserUpdatedEvent_V2 extends BaseEvent {
  version: '2.0';
  userId: string;
  email: string;
  firstName: string;    // Changed: split name
  lastName: string;
  phoneNumber?: string; // New: optional field
}

// Consumer handles both versions
@EventPattern('bobo.users.updated')
handleUserUpdated(event: UserUpdatedEvent_V1 | UserUpdatedEvent_V2) {
  if (event.version === '1.0') {
    // Handle old format
  } else if (event.version === '2.0') {
    // Handle new format
  }
}
```

**Option 2: Separate Topics**
```typescript
// Old topic remains for backward compatibility
'bobo.users.updated.v1'

// New topic for new schema
'bobo.users.updated.v2'

// Gradually migrate consumers to v2
```

#### Compatibility Rules
- ✅ **Safe Changes**: Adding optional fields, adding new event types
- ⚠️ **Careful Changes**: Changing field types, renaming fields
- ❌ **Breaking Changes**: Removing required fields, changing semantics

### 6. Idempotency

Design all event handlers to be idempotent.

#### Implementation Strategies

**Strategy 1: Event ID Tracking**
```typescript
@EventPattern('bobo.orders.created')
async handleOrderCreated(event: OrderCreatedEvent) {
  // Check if already processed
  const exists = await this.redis.get(`event:${event.eventId}`);
  if (exists) {
    console.log('Event already processed, skipping');
    return;
  }
  
  // Process event
  await this.processOrder(event);
  
  // Mark as processed
  await this.redis.set(`event:${event.eventId}`, '1', 'EX', 86400);
}
```

**Strategy 2: Natural Idempotency**
```typescript
// Using unique constraints and upsert operations
await prisma.userProfile.upsert({
  where: { userId: event.userId },
  update: { bio: event.bio },
  create: { 
    userId: event.userId,
    bio: event.bio,
  },
});
```

**Strategy 3: State Machines**
```typescript
// Only process events in valid state transitions
const order = await prisma.order.findUnique({
  where: { id: event.orderId },
});

if (order.status !== 'PENDING') {
  console.log(`Order ${order.id} already processed, current status: ${order.status}`);
  return;
}

// Update only if in correct state
await prisma.order.updateMany({
  where: {
    id: event.orderId,
    status: 'PENDING',
  },
  data: {
    status: 'COMPLETED',
  },
});
```

### 7. Error Handling & Resilience

Design for failure and implement proper error handling.

#### Retry Strategy
```typescript
// Configure Kafka consumer with retry
const kafkaConfig = {
  consumer: {
    retry: {
      retries: 5,
      initialRetryTime: 300,
      multiplier: 2,
      maxRetryTime: 30000,
    },
  },
};
```

#### Dead Letter Queue
```typescript
@EventPattern('bobo.orders.created')
async handleOrderCreated(event: OrderCreatedEvent) {
  try {
    await this.processOrder(event);
  } catch (error) {
    console.error('Failed to process order event:', error);
    
    // After max retries, send to DLQ
    if (this.getRetryCount(event) >= MAX_RETRIES) {
      await this.kafka.publish('bobo.orders.created.dlq', {
        originalEvent: event,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    } else {
      throw error; // Will be retried
    }
  }
}
```

#### Circuit Breaker
```typescript
import CircuitBreaker from 'opossum';

// Protect external service calls
const breaker = new CircuitBreaker(
  async (orderId: string) => {
    return await externalPaymentService.charge(orderId);
  },
  {
    timeout: 3000,
    errorThresholdPercentage: 50,
    resetTimeout: 30000,
  }
);

breaker.on('open', () => {
  console.warn('Circuit breaker opened, failing fast');
});
```

### 8. Observability

Implement comprehensive observability for event-driven systems.

#### Distributed Tracing
```typescript
import { trace, context } from '@opentelemetry/api';

@EventPattern('bobo.orders.created')
async handleOrderCreated(event: OrderCreatedEvent) {
  const span = trace.getTracer('order-service').startSpan('process-order-created');
  
  try {
    span.setAttributes({
      'event.id': event.eventId,
      'order.id': event.orderId,
    });
    
    await this.processOrder(event);
    
    span.setStatus({ code: SpanStatusCode.OK });
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR });
    throw error;
  } finally {
    span.end();
  }
}
```

#### Metrics
```typescript
import { Counter, Histogram } from 'prom-client';

const eventsProcessed = new Counter({
  name: 'kafka_events_processed_total',
  help: 'Total number of Kafka events processed',
  labelNames: ['topic', 'status'],
});

const processingDuration = new Histogram({
  name: 'kafka_event_processing_duration_seconds',
  help: 'Duration of event processing',
  labelNames: ['topic'],
});

@EventPattern('bobo.orders.created')
async handleOrderCreated(event: OrderCreatedEvent) {
  const timer = processingDuration.startTimer({ topic: 'orders.created' });
  
  try {
    await this.processOrder(event);
    eventsProcessed.inc({ topic: 'orders.created', status: 'success' });
  } catch (error) {
    eventsProcessed.inc({ topic: 'orders.created', status: 'error' });
    throw error;
  } finally {
    timer();
  }
}
```

#### Structured Logging
```typescript
import { Logger } from '@nestjs/common';

@EventPattern('bobo.orders.created')
async handleOrderCreated(event: OrderCreatedEvent) {
  this.logger.log({
    message: 'Processing order created event',
    eventId: event.eventId,
    orderId: event.orderId,
    userId: event.userId,
    timestamp: event.timestamp,
  });
}
```

### 9. Data Ownership

Each service owns its data and exposes it through APIs/events.

#### Anti-Pattern
```typescript
// ❌ Bad: Order service directly querying user database
const user = await userDatabase.user.findUnique({
  where: { id: order.userId },
});
```

#### Correct Pattern
```typescript
// ✅ Good: Order service stores denormalized user data
interface Order {
  id: string;
  userId: string;
  userEmail: string;    // Denormalized from user service
  userName: string;      // Denormalized from user service
}

// Update when user changes
@EventPattern('bobo.users.updated')
async handleUserUpdated(event: UserUpdatedEvent) {
  await prisma.order.updateMany({
    where: { userId: event.userId },
    data: {
      userEmail: event.email,
      userName: event.name,
    },
  });
}
```

### 10. Testing Strategy

Test microservices and event flows comprehensively.

#### Unit Tests
```typescript
describe('OrderService', () => {
  it('should publish order created event', async () => {
    const mockKafka = {
      publish: jest.fn(),
    };
    
    const service = new OrderService(mockKafka, mockPrisma);
    await service.createOrder(orderData);
    
    expect(mockKafka.publish).toHaveBeenCalledWith(
      'bobo.orders.created',
      expect.objectContaining({
        orderId: expect.any(String),
      })
    );
  });
});
```

#### Integration Tests
```typescript
describe('Order Flow', () => {
  it('should process complete order flow', async () => {
    // Create order
    const order = await request(app)
      .post('/orders')
      .send(orderData);
    
    // Wait for event processing
    await waitForEvent('bobo.orders.created');
    
    // Verify side effects
    const inventory = await inventoryService.getReservation(order.id);
    expect(inventory.status).toBe('RESERVED');
  });
});
```

## Design Checklist

Before implementing a new microservice:

- [ ] Define bounded context and responsibilities
- [ ] Design event schemas with versioning
- [ ] Plan for eventual consistency
- [ ] Implement idempotent event handlers
- [ ] Set up error handling and DLQ
- [ ] Add observability (logs, metrics, traces)
- [ ] Write tests for event flows
- [ ] Document event contracts
- [ ] Plan for scaling and performance
- [ ] Consider security and authorization

## Common Pitfalls

### 1. Distributed Monolith
Creating microservices that are tightly coupled through synchronous calls.

### 2. Data Consistency Issues
Not handling eventual consistency properly.

### 3. Event Storms
Publishing too many fine-grained events.

### 4. Lack of Versioning
Breaking consumers when changing events.

### 5. Missing Idempotency
Processing duplicate events multiple times.

## Additional Resources

- [Event-Driven Architecture](https://martinfowler.com/articles/201701-event-driven.html)
- [Kafka Documentation](https://kafka.apache.org/documentation/)
- [Microservices Patterns](https://microservices.io/patterns/index.html)
- [Domain-Driven Design](https://www.domainlanguage.com/ddd/)

---

**Version**: 1.0.0  
**Last Updated**: November 14, 2025  
**Next Review**: February 14, 2026

