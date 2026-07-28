from one_liner.server import RouterServer

from random import randint
from time import sleep

from pydantic import BaseModel

################################################################################
#
#    RPC example
#
################################################################################


class Manufacturer(BaseModel):
    name: str = "Clone-R-us"
    location: str = "Kamino, Outer Rim Territories"
    model_number: str = "J3D1"


class MiceCloningMachine(BaseModel):
    original_mice: list[str]
    clone_count: int = 0
    manufacturer: Manufacturer = Manufacturer()

    # Function with no type hints, to demonstrate that it can still be used as an RPC.
    def execute_order_67(self):
        return "Clone army go forth and... dance!"

    # Function with type hints.
    def check_clone_count(self) -> int:
        return self.clone_count

    # Function with type hints, default arguments, and description.
    def clone_mice(self, mouse: str, num_of_clones: int = 1) -> str:
        """Clone a mouse"""
        if mouse in self.original_mice:
            self.clone_count += num_of_clones
            return f"cloned {num_of_clones} of {mouse} - total clones: {self.clone_count}"
        return f"Failed to clone {mouse} - not in original mice list."

    # Function that where type hint is a complex model (pydantic BaseModel)
    def get_manufacturer_info(self) -> Manufacturer:
        return self.manufacturer


################################################################################
#
#    Streams example
#
################################################################################


def the_perpetual_dice_roller() -> int:
    """Roll a die and return the result."""
    return randint(1, 6)


################################################################################
#
#    Client code
#
################################################################################


if __name__ == "__main__":
    clone_machine = MiceCloningMachine(original_mice=["Mickey", "Minnie", "JangoFett"])
    server = RouterServer(instances={"clone_machine": clone_machine})

    # Add RPCs
    print("Adding rpcs...")

    server.add_named_call(
        "clone_mice",
        "clone_machine",
        "clone_mice",
    )
    server.add_named_call(
        "check_clone_count",
        "clone_machine",
        "check_clone_count",
    )
    server.add_named_call(
        "execute_order_67",
        "clone_machine",
        "execute_order_67",
    )
    server.add_named_call(
        "get_manufacturer_info",
        "clone_machine",
        "get_manufacturer_info",
    )

    # Add streams
    print("Adding streams...")
    server.add_stream_from_callable(
        "dice_roll",
        1,
        the_perpetual_dice_roller,
    )

    server.run()  # Start broadcast and rpc threads.

    try:
        while True:
            sleep(0.1)
    finally:
        server.close()
