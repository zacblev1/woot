/*
 * Compile me:  gcc hello.c -o hello
 * Run me:      ./hello
 *
 * gcc turns this text into a program the CPU can run directly.
 * (Here, the "CPU" is itself a program running in your browser. Wild.)
 */
#include <stdio.h>

int main(void)
{
    for (int i = 3; i > 0; i--)
        printf("%d...\n", i);

    printf("Hello from C!\n");
    return 0;
}
