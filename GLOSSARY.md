# Call Calendar

Guests book calls with a single admin.

## Language

**Guest**:
A person who books a call with the **Admin**.
_Avoid_: User, visitor, client

**Admin**:
The one person **Guests** book calls with.
_Avoid_: Host, owner

**Event type**:
A kind of call the **Admin** creates and offers to **Guests**, with a title, an optional description and a duration.
_Avoid_: Call type, meeting type, service, slot type

**Slot**:
A stretch of time with a fixed start and the duration of an **Event type** that a **Guest** can book.
_Avoid_: Opening

**Booking**:
A **Slot** reserved by a **Guest**.
_Avoid_: Event, appointment, meeting

**Upcoming booking**:
A **Booking** that has not ended yet.
_Avoid_: Future booking, active booking

**Working hours**:
The weekly hours, by wall-clock time in the **Admin**'s time zone, within which every **Slot** must start and end.
_Avoid_: Business hours, availability

**Booking window**:
The range of calendar dates, in the **Admin**'s time zone, on which a **Guest** may book a **Slot**.
_Avoid_: Booking horizon, booking period
