import random
import webbrowser
import sys
import select


def timedInput(prompt, timeout):
    print(prompt)
    rlist, _, _ = select.select([sys.stdin], [], [], timeout)
    if rlist:
        return sys.stdin.readline().strip().lower()
    else:
        return None



file = open("word-list-extra-large.txt", "r")
words = file.read()
words = words.split("\n")
winStreak = 0


def makePrompt():
  global promptWord
  promptWord = random.choice(words)

  promptLen = random.randint(2, 3)
  if len(promptWord) < 3:
    prompt = promptWord
  else:
    wordIndex = random.randint(0,len(promptWord)-1-promptLen)
    prompt = promptWord[wordIndex:wordIndex+promptLen]
  return prompt


def checkDef():
  print(f"Do you wish to see the definition of {promptWord}?(y/n)")
  define = input().lower()

  if define == "y":
    webbrowser.open(f"https://www.merriam-webster.com/dictionary/{promptWord}")
  elif define == "n":
    print("Okay")
  else:
    print("Invalid input\n")
    checkDef()


usedWords = []
def Round():
  while True:
    global winStreak
    print(f"Prompt is '{prompt}'")
    userWord = timedInput(f"Please enter a word: (you start with {round(10.00 - winStreak/10, 2)} seconds)", 10.00 - winStreak/10)

    if userWord is None:
      print("You lose, a possible word is", promptWord)
      winStreak = 0
      checkDef()
      input("Press enter when you want to continue")
      break

    if userWord in usedWords and prompt in userWord:
      print("Already used that word, try again")

    elif userWord in words and prompt in userWord:
      print(userWord,"is correct!")
      winStreak += 1
      usedWords.append(userWord)
      break

    else:
      print("Try again \n")


while True:
  print("Win streak:", winStreak)
  prompt = makePrompt()
  Round()
  print("Next round...\n\n")