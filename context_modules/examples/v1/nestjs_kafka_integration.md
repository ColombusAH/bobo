# NestJS + Kafka Integration Best Practices

## Overview

This guide provides best practices for integrating Apache Kafka with NestJS applications in an Nx monorepo environment.

## Setup

### Installation

```bash
npm install --save @nestjs/microservices kafkajs
```

### Configuration Module

Create a Kafka configuration service:

```typescript
// libs/shared/src/config/kafka.config.ts
import { KafkaOptions, Transport } from '@nestjs/microservices';

export const getKafkaConfig = (): KafkaOptions => ({
  transport: Transport.KAFKA,
  options: {
    client: {
      clientId: process.env.KAFKA_CLIENT_ID || 'bobo-service',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    },
    consumer: {
      groupId: process.env.KAFKA_CONSUMER_GROUP || 'bobo-consumer-group',
      allowAutoTopicCreation: false,
      retry: {
        retries: 5,
        initialRetryTime: 300,
      },
    },
    producer: {
      allowAutoTopicCreation: false,
      retry: {
        retries: 5,
      },
    },
  },
});
```

## Producer Pattern

### Event Publishing Service

```typescript
// apps/backend/src/events/kafka-producer.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { getKafkaConfig } from '@bobo/shared/config';

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private client: ClientKafka;

  constructor() {
    this.client = new ClientKafka(getKafkaConfig().options);
  }

  async onModuleInit() {
    await this.client.connect();
  }

  async onModuleDestroy() {
    await this.client.close();
  }

  async publishEvent<T>(topic: string, event: T): Promise<void> {
    try {
      await this.client.emit(topic, event).toPromise();
      console.log(`Event published to ${topic}:`, event);
    } catch (error) {
      console.error(`Failed to publish event to ${topic}:`, error);
      throw error;
    }
  }

  async publishEventWithKey<T>(
    topic: string,
    key: string,
    event: T,
  ): Promise<void> {
    try {
      await this.client.emit(topic, { key, value: event }).toPromise();
      console.log(`Event with key ${key} published to ${topic}`);
    } catch (error) {
      console.error(`Failed to publish event to ${topic}:`, error);
      throw error;
    }
  }
}
```

### Usage Example

```typescript
// apps/backend/src/users/users.service.ts
import { Injectable } from '@nestjs/common';
import { KafkaProducerService } from '../events/kafka-producer.service';
import { UserCreatedEvent } from '@bobo/kafka-events';

@Injectable()
export class UsersService {
  constructor(private readonly kafkaProducer: KafkaProducerService) {}

  async createUser(userData: CreateUserDto) {
    // Create user in database
    const user = await this.usersRepository.create(userData);

    // Publish event
    const event: UserCreatedEvent = {
      eventId: uuidv4(),
      timestamp: new Date().toISOString(),
      userId: user.id,
      email: user.email,
      version: '1.0',
    };

    await this.kafkaProducer.publishEvent('bobo.users.created', event);

    return user;
  }
}
```

## Consumer Pattern

### Event Consumer Controller

```typescript
// apps/backend/src/events/kafka-consumer.controller.ts
import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { UserCreatedEvent } from '@bobo/kafka-events';

@Controller()
export class KafkaConsumerController {
  @EventPattern('bobo.users.created')
  async handleUserCreated(@Payload() event: UserCreatedEvent) {
    console.log('Received user.created event:', event);
    
    try {
      // Process the event
      await this.processUserCreated(event);
    } catch (error) {
      console.error('Error processing user.created event:', error);
      // Implement dead letter queue or retry logic
      throw error;
    }
  }

  private async processUserCreated(event: UserCreatedEvent) {
    // Business logic here
    // e.g., send welcome email, create user profile, etc.
  }
}
```

### Bootstrap with Microservice

```typescript
// apps/backend/src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { getKafkaConfig } from '@bobo/shared/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Connect Kafka microservice
  app.connectMicroservice(getKafkaConfig());
  
  await app.startAllMicroservices();
  await app.listen(3000);
  
  console.log('Application is running on: http://localhost:3000');
}

bootstrap();
```

## Event Schema Library

Store event schemas in a shared library:

```typescript
// libs/kafka-events/src/lib/user.events.ts
export interface BaseEvent {
  eventId: string;
  timestamp: string;
  version: string;
}

export interface UserCreatedEvent extends BaseEvent {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

export interface UserUpdatedEvent extends BaseEvent {
  userId: string;
  changes: Record<string, any>;
}

export interface UserDeletedEvent extends BaseEvent {
  userId: string;
  reason?: string;
}
```

## Error Handling & Retry Logic

### Dead Letter Queue Pattern

```typescript
// apps/backend/src/events/kafka-dlq.service.ts
import { Injectable } from '@nestjs/common';
import { KafkaProducerService } from './kafka-producer.service';

@Injectable()
export class KafkaDLQService {
  constructor(private readonly kafkaProducer: KafkaProducerService) {}

  async sendToDeadLetterQueue(
    originalTopic: string,
    event: any,
    error: Error,
  ): Promise<void> {
    const dlqEvent = {
      originalTopic,
      originalEvent: event,
      error: {
        message: error.message,
        stack: error.stack,
      },
      timestamp: new Date().toISOString(),
    };

    await this.kafkaProducer.publishEvent(
      `${originalTopic}.dlq`,
      dlqEvent,
    );
  }
}
```

## Best Practices

### 1. Topic Naming Convention
- Use a consistent prefix: `bobo.<domain>.<action>`
- Examples: `bobo.users.created`, `bobo.orders.fulfilled`

### 2. Event Versioning
- Always include a `version` field in events
- Create new event types for breaking changes
- Maintain backward compatibility when possible

### 3. Idempotency
- Include unique `eventId` in all events
- Implement idempotent event handlers
- Store processed event IDs to prevent duplicate processing

### 4. Monitoring & Logging
- Log all published and consumed events
- Monitor consumer lag
- Track event processing times
- Alert on DLQ accumulation

### 5. Testing
```typescript
// test example
describe('KafkaProducerService', () => {
  let service: KafkaProducerService;
  let mockClient: jest.Mocked<ClientKafka>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [KafkaProducerService],
    }).compile();

    service = module.get<KafkaProducerService>(KafkaProducerService);
    mockClient = {
      emit: jest.fn().mockReturnValue(of(null)),
    } as any;
  });

  it('should publish event successfully', async () => {
    const event = { userId: '123', email: 'test@example.com' };
    await service.publishEvent('test.topic', event);
    expect(mockClient.emit).toHaveBeenCalledWith('test.topic', event);
  });
});
```

### 6. Configuration
- Use environment variables for broker addresses
- Configure consumer groups per service
- Set appropriate retention policies
- Enable compression for large messages

## Additional Resources

- [NestJS Microservices Documentation](https://docs.nestjs.com/microservices/kafka)
- [KafkaJS Documentation](https://kafka.js.org/)
- [Kafka Best Practices](https://kafka.apache.org/documentation/#bestpractices)

