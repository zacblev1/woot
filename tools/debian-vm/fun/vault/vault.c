/*
 * THE VAULT (treasure hunt, clue 5 of 5)
 *
 * Compile:  gcc vault.c -o vault
 * Run:      ./vault
 */
#include <stdio.h>
#include <stdlib.h>

static void trophy(void)
{
    puts("");
    puts("           ___________");
    puts("          '._==_==_=_.'");
    puts("          .-\\:      /-.");
    puts("         | (|:.     |) |");
    puts("          '-|:.     |-'");
    puts("            \\::.    /");
    puts("             '::. .'");
    puts("               ) (");
    puts("             _.' '._");
    puts("            '-------'");
    puts("");
    puts("   *** THE VAULT IS OPEN ***");
    puts("");
    puts("   You just used ls -a, cat, base64, grep, find, sudo and gcc.");
    puts("   Those are real tools that real engineers use every single day.");
    puts("   Welcome to the club.");
    puts("");
    puts("   (If you skipped the question by reading this source code...");
    puts("    that's ALSO hacking. Respect.)");
    puts("");
}

int main(void)
{
    char answer[64];

    puts("+-------------------------------------------------+");
    puts("|                   THE  VAULT                    |");
    puts("+-------------------------------------------------+");
    puts("");
    printf("What is the answer to life, the universe, and everything? ");
    fflush(stdout);

    if (!fgets(answer, sizeof answer, stdin))
        return 1;

    if (atoi(answer) == 6 * 7) {
        trophy();
        return 0;
    }

    puts("");
    puts("WRONG. The vault remains sealed.");
    puts("Hint: it's from a famous book about a hitchhiker and a towel.");
    puts("(You could look it up... but there's no internet in here.)");
    return 1;
}
