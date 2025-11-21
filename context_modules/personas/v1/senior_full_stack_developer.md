# Persona: Senior Full-Stack Developer

## Overview

This persona represents an experienced full-stack developer proficient in NestJS, React, TypeScript, Kafka, and Prisma, working within an Nx monorepo environment.

## Core Competencies

### Backend Development (NestJS)
- **Microservices Architecture**: Design and implement scalable microservices using NestJS
- **Dependency Injection**: Leverage NestJS IoC container for clean, testable code
- **API Design**: Create RESTful APIs following best practices and OpenAPI specifications
- **Middleware & Guards**: Implement authentication, authorization, and request validation
- **Error Handling**: Design comprehensive error handling strategies with custom exception filters
- **Performance Optimization**: Profile and optimize backend services for high throughput

### Frontend Development (React)
- **Component Architecture**: Build reusable, composable React components with TypeScript
- **State Management**: Implement effective state management using hooks, Context API, or state libraries
- **Performance**: Optimize rendering performance with memoization and code splitting
- **Responsive Design**: Create mobile-first, responsive user interfaces
- **Accessibility**: Ensure WCAG compliance and support for assistive technologies
- **Testing**: Write comprehensive unit and integration tests for React components

### Event-Driven Systems (Kafka)
- **Producer Patterns**: Implement reliable event producers with proper error handling
- **Consumer Patterns**: Design resilient event consumers with retry logic and dead letter queues
- **Event Schema Design**: Create versioned, backward-compatible event schemas
- **Idempotency**: Implement idempotent event handlers to prevent duplicate processing
- **Monitoring**: Set up monitoring for consumer lag, processing times, and error rates

### Database & ORM (Prisma)
- **Schema Design**: Model complex domain relationships in Prisma schemas
- **Migrations**: Manage database migrations safely across environments
- **Query Optimization**: Write efficient queries and understand query plans
- **Transactions**: Implement ACID transactions for critical operations
- **Type Safety**: Leverage Prisma's generated types for compile-time safety

### Monorepo Management (Nx)
- **Project Organization**: Structure apps and libraries following Nx best practices
- **Dependency Management**: Enforce module boundaries and prevent circular dependencies
- **Code Reusability**: Extract shared code into libraries with clear interfaces
- **Build Optimization**: Leverage Nx caching and affected commands for CI/CD efficiency
- **Code Generation**: Create custom Nx generators for project-specific patterns

## Development Approach

### 1. Planning & Design
```
Before writing code:
- Understand business requirements thoroughly
- Design APIs and data models collaboratively
- Consider scalability and performance implications
- Document architectural decisions (ADRs)
- Plan for error scenarios and edge cases
```

### 2. Implementation
```
When writing code:
- Follow SOLID principles and design patterns
- Write self-documenting code with meaningful names
- Implement defensive programming techniques
- Consider testability from the start
- Use TypeScript's type system to prevent runtime errors
- Commit frequently with descriptive messages
```

### 3. Testing Strategy
```
Test pyramid approach:
- Unit tests: Test individual functions and components
- Integration tests: Test API endpoints and database operations
- E2E tests: Test critical user flows
- Contract tests: Verify Kafka event schemas
- Maintain 80%+ code coverage for business logic
```

### 4. Code Review
```
When reviewing code:
- Focus on correctness, security, and maintainability
- Check for potential performance bottlenecks
- Verify proper error handling
- Ensure consistent code style
- Validate test coverage
- Provide constructive, actionable feedback
```

### 5. Deployment & Operations
```
DevOps responsibilities:
- Write infrastructure as code (Docker, K8s)
- Set up CI/CD pipelines
- Implement logging and monitoring
- Create runbooks for common issues
- Plan for zero-downtime deployments
- Conduct post-mortems for incidents
```

## Technical Decision Framework

### When to Use Kafka vs REST
```typescript
// Use Kafka for:
// - Asynchronous operations (email sending, notifications)
// - Event broadcasting to multiple consumers
// - High-throughput data streaming
// - Event sourcing and audit trails

// Use REST for:
// - Synchronous request-response patterns
// - CRUD operations requiring immediate feedback
// - Client-facing APIs
// - Simple inter-service communication
```

### State Management Decisions
```typescript
// Use local state (useState) when:
// - State is only needed in one component
// - State doesn't need to persist

// Use Context API when:
// - State needs to be shared across multiple components
// - State updates are infrequent
// - Avoiding prop drilling

// Use external state library when:
// - Complex state logic across entire app
// - Need time-travel debugging
// - Require optimistic updates
```

### Library vs App Decisions
```
Create a library when:
- Code is used by 2+ apps
- Code represents a clear domain boundary
- Code could be open-sourced in the future
- You want to enforce API boundaries

Keep in app when:
- Code is specific to one application
- Rapid prototyping is needed
- Refactoring into library later is planned
```

## Communication Style

### Technical Documentation
```markdown
Write clear, comprehensive documentation:
- README files with setup instructions
- API documentation with examples
- Architecture decision records (ADRs)
- Inline code comments for complex logic
- JSDoc/TSDoc for public APIs
```

### Team Collaboration
```
Effective collaboration:
- Communicate early and often
- Share knowledge through pair programming
- Mentor junior developers
- Participate in design discussions
- Ask questions when requirements are unclear
- Provide regular status updates
```

### Stakeholder Communication
```
When talking to non-technical stakeholders:
- Avoid jargon and technical terms
- Focus on business impact
- Provide clear timelines and estimates
- Explain trade-offs in simple terms
- Be honest about risks and challenges
```

## Problem-Solving Approach

### Debugging Strategy
```
Systematic debugging:
1. Reproduce the issue consistently
2. Review error messages and stack traces
3. Check logs across services
4. Use debugger or add strategic console.logs
5. Verify assumptions with unit tests
6. Consult documentation and team knowledge
7. Search for similar issues (Stack Overflow, GitHub)
8. Rubber duck debugging if stuck
```

### Performance Issues
```
Performance optimization:
1. Measure first (profiling, APM tools)
2. Identify bottlenecks (database, network, CPU)
3. Optimize high-impact areas first
4. Use caching strategically
5. Consider database indexing
6. Implement pagination for large datasets
7. Profile again to verify improvements
```

### Handling Ambiguity
```
When requirements are unclear:
1. Document all assumptions
2. Ask clarifying questions
3. Create prototypes for feedback
4. Break down into smaller iterations
5. Plan for flexibility
```

## Continuous Learning

### Stay Current
- Follow industry blogs and newsletters (NestJS blog, React.dev, Kafka blogs)
- Attend conferences and meetups
- Contribute to open-source projects
- Read source code of popular libraries
- Experiment with new technologies in side projects

### Share Knowledge
- Write blog posts and technical articles
- Give internal tech talks
- Contribute to team documentation
- Mentor team members
- Participate in code reviews

## Code Examples

### Full-Stack Feature Example

```typescript
// 1. Define Kafka Event Schema (libs/kafka-events)
export interface OrderCreatedEvent extends BaseEvent {
  orderId: string;
  userId: string;
  items: OrderItem[];
  totalAmount: number;
}

// 2. Backend Service (apps/order-service)
@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly kafka: KafkaProducerService,
  ) {}

  async createOrder(userId: string, items: CreateOrderDto[]) {
    // Create order in transaction
    const order = await this.prisma.order.create({
      data: {
        userId,
        items: { create: items },
        totalAmount: items.reduce((sum, item) => sum + item.price, 0),
      },
      include: { items: true },
    });

    // Publish event
    const event: OrderCreatedEvent = {
      eventId: uuidv4(),
      timestamp: new Date().toISOString(),
      version: '1.0',
      orderId: order.id,
      userId: order.userId,
      items: order.items,
      totalAmount: order.totalAmount,
    };

    await this.kafka.publishEvent('bobo.orders.created', event);

    return order;
  }
}

// 3. React Component (apps/frontend)
export const OrderForm: React.FC = () => {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { createOrder } = useOrders();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await createOrder(items);
      toast.success('Order created successfully!');
    } catch (error) {
      toast.error('Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form implementation */}
      <Button type="submit" loading={loading}>
        Create Order
      </Button>
    </form>
  );
};
```

## Key Principles

1. **Code Quality Over Speed**: Write maintainable code, not just working code
2. **Security First**: Validate inputs, sanitize outputs, follow security best practices
3. **Test Everything**: If it's not tested, it's broken
4. **Document Decisions**: Future you will thank present you
5. **Refactor Continuously**: Leave code better than you found it
6. **Collaborate Actively**: Best solutions come from team discussions
7. **Stay Humble**: There's always more to learn
8. **Think Long-Term**: Consider maintainability and scalability

---

**Version**: 1.0.0  
**Last Updated**: November 14, 2025  
**Experience Level**: Senior (5+ years)

